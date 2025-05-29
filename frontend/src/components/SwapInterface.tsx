import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../contexts/Web3Context";
import { useNotification } from "../contexts/NotificationContext";
import { TokenInfo } from "../utils/tokenStorage";

interface SwapInterfaceProps {
  importedTokens: TokenInfo[];
  onBalanceUpdate?: () => void;
}

const SwapInterface: React.FC<SwapInterfaceProps> = ({
  importedTokens,
  onBalanceUpdate,
}) => {
  const { signer, routerContract, isConnected, tokenBalances } = useWeb3();
  const { addNotification } = useNotification();

  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [slippage, setSlippage] = useState("0.5");

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  // 计算输出金额
  const calculateOutputAmount = async (inputAmount: string) => {
    if (
      !routerContract ||
      !fromToken ||
      !toToken ||
      !inputAmount ||
      inputAmount === "0"
    ) {
      setToAmount("");
      return;
    }

    try {
      setCalculating(true);
      const amountIn = ethers.parseUnits(inputAmount, fromToken.decimals);
      const path = [fromToken.address, toToken.address];

      const amounts = await routerContract.getAmountsOut(amountIn, path);
      const amountOut = ethers.formatUnits(amounts[1], toToken.decimals);
      setToAmount(amountOut);
    } catch (error) {
      console.error("计算输出金额失败:", error);
      setToAmount("");
      addNotification({
        type: "error",
        title: "计算失败",
        message: "计算价格失败，可能是没有流动性",
      });
    } finally {
      setCalculating(false);
    }
  };

  // 检查并批准代币
  const checkAndApproveToken = async (token: TokenInfo, amount: string) => {
    if (!signer) return false;

    try {
      const tokenContract = new ethers.Contract(
        token.address,
        ERC20_ABI,
        signer
      );
      const amountToApprove = ethers.parseUnits(amount, token.decimals);
      const signerAddress = await signer.getAddress();
      const routerAddress = await routerContract?.getAddress();

      // 检查当前授权额度
      const currentAllowance = await tokenContract.allowance(
        signerAddress,
        routerAddress
      );

      if (currentAllowance < amountToApprove) {
        addNotification({
          type: "info",
          title: "授权确认",
          message: "需要授权代币，请确认交易",
        });
        const approveTx = await tokenContract.approve(
          routerAddress,
          amountToApprove
        );
        await approveTx.wait();
        addNotification({
          type: "success",
          title: "授权成功",
          message: "代币授权成功",
        });
      }

      return true;
    } catch (error) {
      console.error("授权失败:", error);
      addNotification({
        type: "error",
        title: "授权失败",
        message: "代币授权失败",
      });
      return false;
    }
  };

  // 执行交换
  const handleSwap = async () => {
    if (
      !routerContract ||
      !signer ||
      !fromToken ||
      !toToken ||
      !fromAmount ||
      !toAmount
    ) {
      addNotification({
        type: "error",
        title: "信息不完整",
        message: "请填写完整的交换信息",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. 检查并授权代币
      const approved = await checkAndApproveToken(fromToken, fromAmount);
      if (!approved) {
        setLoading(false);
        return;
      }

      // 2. 计算最小输出金额（考虑滑点）
      const slippageDecimal = parseFloat(slippage) / 100;
      const minAmountOut = ethers.parseUnits(
        (parseFloat(toAmount) * (1 - slippageDecimal)).toFixed(
          toToken.decimals
        ),
        toToken.decimals
      );

      // 3. 准备交换参数
      const amountIn = ethers.parseUnits(fromAmount, fromToken.decimals);
      const path = [fromToken.address, toToken.address];
      const to = await signer.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟后过期

      addNotification({
        type: "info",
        title: "交换中",
        message: "正在执行代币交换...",
      });

      // 4. 执行交换
      const swapTx = await routerContract.swapExactTokensForTokens(
        amountIn,
        minAmountOut,
        path,
        to,
        deadline
      );

      await swapTx.wait();
      addNotification({
        type: "success",
        title: "交换成功",
        message: "代币交换成功！",
      });

      // 5. 重置表单
      setFromAmount("");
      setToAmount("");

      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    } catch (error) {
      console.error("交换失败:", error);
      addNotification({
        type: "error",
        title: "交换失败",
        message: "代币交换失败",
      });
    } finally {
      setLoading(false);
    }
  };

  // 交换 from 和 to 代币
  const handleReverseTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount("");
    setToAmount("");
  };

  // 当输入金额变化时计算输出
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromAmount && parseFloat(fromAmount) > 0) {
        calculateOutputAmount(fromAmount);
      } else {
        setToAmount("");
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAmount, fromToken, toToken]);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <span className="text-3xl">🔗</span>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          连接钱包开始
        </h3>
        <p className="text-secondary text-sm">请先连接您的钱包以进行代币交换</p>
      </div>
    );
  }

  if (importedTokens.length < 2) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
          <span className="text-3xl">📝</span>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          需要更多代币
        </h3>
        <p className="text-secondary text-sm mb-4">
          至少需要导入 2 个代币才能进行交换
        </p>
        <div className="info-card inline-block">
          <p className="text-sm">💡 请先在"导入代币"页面添加需要交换的代币</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
          <span>🔄</span> 代币交换
        </h2>
        <p className="text-secondary text-sm">
          基于 UniswapV2 AMM 算法的去中心化交换
        </p>
      </div>

      {/* 滑点设置 */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">滑点容忍度</span>
          <div className="flex items-center space-x-2">
            {["0.1", "0.5", "1.0"].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${
                  slippage === value
                    ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                    : "bg-white/10 text-muted hover:text-secondary hover:bg-white/15"
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-16 px-2 py-1 text-xs bg-white/10 border border-white/20 text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="自定义"
              step="0.1"
              min="0.1"
              max="50"
            />
            <span className="text-xs text-muted">%</span>
          </div>
        </div>
      </div>

      {/* 交换界面 */}
      <div className="space-y-4">
        {/* From Token */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-primary">从</span>
            <span className="text-xs text-muted">
              余额:{" "}
              {fromToken
                ? parseFloat(tokenBalances[fromToken.address] || "0").toFixed(4)
                : "0.0000"}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-medium text-primary placeholder-muted focus:outline-none"
              disabled={loading}
            />
            <select
              value={fromToken?.address || ""}
              onChange={(e) => {
                const token = importedTokens.find(
                  (t) => t.address === e.target.value
                );
                setFromToken(token || null);
              }}
              className="bg-white/10 border border-white/20 text-primary px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
              disabled={loading}
            >
              <option value="">选择代币</option>
              {importedTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 交换按钮 */}
        <div className="flex justify-center">
          <button
            onClick={handleReverseTokens}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-105"
            disabled={loading}
          >
            <svg
              className="w-5 h-5 text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-primary">到</span>
            <span className="text-xs text-muted">
              余额:{" "}
              {toToken
                ? parseFloat(tokenBalances[toToken.address] || "0").toFixed(4)
                : "0.0000"}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={calculating ? "计算中..." : toAmount}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-medium text-primary placeholder-muted focus:outline-none"
              disabled
            />
            <select
              value={toToken?.address || ""}
              onChange={(e) => {
                const token = importedTokens.find(
                  (t) => t.address === e.target.value
                );
                setToToken(token || null);
              }}
              className="bg-white/10 border border-white/20 text-primary px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
              disabled={loading}
            >
              <option value="">选择代币</option>
              {importedTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 交换信息 */}
      {fromToken && toToken && toAmount && (
        <div className="info-card">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-accent font-medium">交换比例:</span>
              <span className="font-mono">
                1 {fromToken.symbol} ={" "}
                {(parseFloat(toAmount) / parseFloat(fromAmount || "1")).toFixed(
                  6
                )}{" "}
                {toToken.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-accent font-medium">最小接收:</span>
              <span className="font-mono">
                {(
                  parseFloat(toAmount) *
                  (1 - parseFloat(slippage) / 100)
                ).toFixed(6)}{" "}
                {toToken.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-accent font-medium">滑点容忍:</span>
              <span className="font-mono">{slippage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* 交换按钮 */}
      <button
        onClick={handleSwap}
        disabled={
          loading ||
          !fromToken ||
          !toToken ||
          !fromAmount ||
          !toAmount ||
          fromToken.address === toToken.address ||
          calculating
        }
        className="btn-primary w-full"
      >
        {loading && <div className="loading-spinner"></div>}
        {loading ? "交换中..." : calculating ? "计算中..." : "交换代币"}
      </button>

      {/* 提示信息 */}
      <div className="info-card">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div className="text-sm">
            <p className="font-medium mb-1">交换说明：</p>
            <ul className="space-y-1 text-xs opacity-90">
              <li>• 交换前需要足够的代币余额和流动性</li>
              <li>• 首次交换需要授权代币给路由器合约</li>
              <li>• 滑点保护机制避免价格波动损失</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapInterface;
