import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../contexts/Web3Context";
import { useNotification } from "../contexts/NotificationContext";
import { TokenInfo } from "../utils/tokenStorage";

interface LiquidityInterfaceProps {
  importedTokens: TokenInfo[];
  onBalanceUpdate?: () => void;
}

const LiquidityInterface: React.FC<LiquidityInterfaceProps> = ({
  importedTokens,
  onBalanceUpdate,
}) => {
  const {
    signer,
    routerContract,
    factoryContract,
    isConnected,
    tokenBalances,
  } = useWeb3();
  const { addNotification } = useNotification();

  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [lpTokenBalance, setLpTokenBalance] = useState("0");
  const [removePercentage, setRemovePercentage] = useState("25");

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ];

  const PAIR_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  ];

  // 获取流动性代币余额
  const fetchLPTokenBalance = async () => {
    if (!factoryContract || !signer || !tokenA || !tokenB) {
      console.log("❌ LP余额获取条件不满足:", {
        factoryContract: !!factoryContract,
        signer: !!signer,
        tokenA: !!tokenA,
        tokenB: !!tokenB,
      });
      return;
    }

    try {
      console.log("🔍 获取LP代币余额...");
      console.log("代币对:", tokenA.symbol, "➔", tokenB.symbol);

      const pairAddress = await factoryContract.getPair(
        tokenA.address,
        tokenB.address
      );
      console.log("交易对地址:", pairAddress);

      if (pairAddress === ethers.ZeroAddress) {
        console.log("❌ 交易对不存在");
        setLpTokenBalance("0");
        return;
      }

      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, signer);
      const signerAddress = await signer.getAddress();
      const balance = await pairContract.balanceOf(signerAddress);
      const decimals = 18; // LP代币默认18位小数
      const formattedBalance = ethers.formatUnits(balance, decimals);

      console.log("✅ LP代币余额获取成功:", formattedBalance);
      setLpTokenBalance(formattedBalance);
    } catch (error) {
      console.error("❌ 获取LP代币余额失败:", error);
      setLpTokenBalance("0");
    }
  };

  // 检查并授权代币
  const checkAndApproveToken = async (token: TokenInfo, amount: string) => {
    if (!signer || !routerContract) return false;

    try {
      const tokenContract = new ethers.Contract(
        token.address,
        ERC20_ABI,
        signer
      );
      const amountToApprove = ethers.parseUnits(amount, token.decimals);
      const signerAddress = await signer.getAddress();
      const routerAddress = await routerContract.getAddress();

      const currentAllowance = await tokenContract.allowance(
        signerAddress,
        routerAddress
      );

      if (currentAllowance < amountToApprove) {
        addNotification({
          type: "info",
          title: "授权确认",
          message: `需要授权 ${token.symbol}，请确认交易`,
        });
        const approveTx = await tokenContract.approve(
          routerAddress,
          amountToApprove
        );
        await approveTx.wait();
        addNotification({
          type: "success",
          title: "授权成功",
          message: `${token.symbol} 授权成功`,
        });
      }

      return true;
    } catch (error) {
      console.error("授权失败:", error);
      addNotification({
        type: "error",
        title: "授权失败",
        message: `${token.symbol} 授权失败`,
      });
      return false;
    }
  };

  // 添加流动性
  const handleAddLiquidity = async () => {
    if (
      !routerContract ||
      !signer ||
      !tokenA ||
      !tokenB ||
      !amountA ||
      !amountB
    ) {
      addNotification({
        type: "error",
        title: "信息不完整",
        message: "请填写完整的流动性信息",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. 授权两个代币
      const approveA = await checkAndApproveToken(tokenA, amountA);
      if (!approveA) {
        setLoading(false);
        return;
      }

      const approveB = await checkAndApproveToken(tokenB, amountB);
      if (!approveB) {
        setLoading(false);
        return;
      }

      // 2. 计算最小数量（5%滑点）
      const amountADesired = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBDesired = ethers.parseUnits(amountB, tokenB.decimals);
      const amountAMin = (amountADesired * BigInt(95)) / BigInt(100);
      const amountBMin = (amountBDesired * BigInt(95)) / BigInt(100);

      const to = await signer.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      addNotification({
        type: "info",
        title: "添加中",
        message: "正在添加流动性...",
      });

      // 3. 添加流动性
      const tx = await routerContract.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        to,
        deadline
      );

      await tx.wait();
      addNotification({
        type: "success",
        title: "添加成功",
        message: "流动性添加成功！",
      });

      // 4. 重置表单
      setAmountA("");
      setAmountB("");
      fetchLPTokenBalance();

      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    } catch (error) {
      console.error("添加流动性失败:", error);
      addNotification({
        type: "error",
        title: "添加失败",
        message: "添加流动性失败",
      });
    } finally {
      setLoading(false);
    }
  };

  // 移除流动性
  const handleRemoveLiquidity = async () => {
    if (!routerContract || !signer || !tokenA || !tokenB || !factoryContract) {
      addNotification({
        type: "error",
        title: "信息不完整",
        message: "请选择代币对",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("🔄 开始移除流动性...");
      console.log("代币A:", tokenA.symbol, tokenA.address);
      console.log("代币B:", tokenB.symbol, tokenB.address);
      console.log("移除比例:", removePercentage + "%");

      // 1. 获取交易对地址
      const pairAddress = await factoryContract.getPair(
        tokenA.address,
        tokenB.address
      );
      console.log("交易对地址:", pairAddress);

      if (pairAddress === ethers.ZeroAddress) {
        addNotification({
          type: "error",
          title: "交易对不存在",
          message: "该交易对不存在",
        });
        setLoading(false);
        return;
      }

      // 2. 计算要移除的LP代币数量
      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, signer);
      const signerAddress = await signer.getAddress();
      const lpBalance = await pairContract.balanceOf(signerAddress);
      const removeAmount = (lpBalance * BigInt(removePercentage)) / BigInt(100);

      console.log("LP代币余额:", ethers.formatUnits(lpBalance, 18));
      console.log("要移除数量:", ethers.formatUnits(removeAmount, 18));

      if (removeAmount === BigInt(0)) {
        addNotification({
          type: "error",
          title: "余额不足",
          message: "没有足够的流动性代币",
        });
        setLoading(false);
        return;
      }

      // 3. 授权LP代币给路由器
      const routerAddress = await routerContract.getAddress();
      console.log("路由器地址:", routerAddress);

      // 检查当前授权
      const currentAllowance = await pairContract.allowance(
        signerAddress,
        routerAddress
      );
      console.log("当前LP代币授权:", ethers.formatUnits(currentAllowance, 18));

      if (currentAllowance < removeAmount) {
        console.log("需要授权LP代币...");
        addNotification({
          type: "info",
          title: "授权确认",
          message: "需要授权LP代币，请确认交易",
        });

        const approveTx = await pairContract.approve(
          routerAddress,
          removeAmount
        );
        await approveTx.wait();
        console.log("LP代币授权成功");

        addNotification({
          type: "success",
          title: "授权成功",
          message: "LP代币授权成功",
        });
      }

      // 4. 计算最小获得数量（5%滑点）
      const reserves = await pairContract.getReserves();
      const totalSupply = await pairContract.totalSupply();
      const token0 = await pairContract.token0();

      console.log("储备量:", {
        reserve0: ethers.formatUnits(reserves[0], 18),
        reserve1: ethers.formatUnits(reserves[1], 18),
        totalSupply: ethers.formatUnits(totalSupply, 18),
      });

      // 确定代币顺序并计算最小数量
      let amountAMin, amountBMin;
      if (token0.toLowerCase() === tokenA.address.toLowerCase()) {
        // tokenA 是 token0
        amountAMin =
          (reserves[0] * removeAmount * BigInt(95)) /
          (totalSupply * BigInt(100));
        amountBMin =
          (reserves[1] * removeAmount * BigInt(95)) /
          (totalSupply * BigInt(100));
      } else {
        // tokenA 是 token1
        amountAMin =
          (reserves[1] * removeAmount * BigInt(95)) /
          (totalSupply * BigInt(100));
        amountBMin =
          (reserves[0] * removeAmount * BigInt(95)) /
          (totalSupply * BigInt(100));
      }

      console.log("最小获得数量:", {
        amountAMin: ethers.formatUnits(amountAMin, tokenA.decimals),
        amountBMin: ethers.formatUnits(amountBMin, tokenB.decimals),
      });

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      addNotification({
        type: "info",
        title: "移除中",
        message: "正在移除流动性...",
      });

      // 5. 移除流动性
      console.log("调用removeLiquidity...");
      const tx = await routerContract.removeLiquidity(
        tokenA.address,
        tokenB.address,
        removeAmount,
        amountAMin,
        amountBMin,
        signerAddress,
        deadline
      );

      console.log("交易哈希:", tx.hash);
      await tx.wait();
      console.log("移除流动性成功");

      addNotification({
        type: "success",
        title: "移除成功",
        message: `成功移除 ${removePercentage}% 的流动性！`,
      });

      fetchLPTokenBalance();

      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    } catch (error: any) {
      console.error("移除流动性失败:", error);

      let errorMessage = "移除流动性失败";
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        if (error.message.includes("user rejected")) {
          errorMessage = "用户取消了交易";
        } else if (error.message.includes("insufficient allowance")) {
          errorMessage = "授权不足，请重新授权";
        } else if (error.message.includes("insufficient balance")) {
          errorMessage = "LP代币余额不足";
        } else {
          errorMessage = `交易失败: ${error.message}`;
        }
      }

      addNotification({
        type: "error",
        title: "移除失败",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // 当代币对变化时获取LP代币余额
  useEffect(() => {
    if (tokenA && tokenB && tokenA.address !== tokenB.address) {
      fetchLPTokenBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenA, tokenB]);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
          <span className="text-3xl">🔗</span>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          连接钱包开始
        </h3>
        <p className="text-secondary text-sm">请先连接您的钱包以管理流动性</p>
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
          至少需要导入 2 个代币才能管理流动性
        </p>
        <div className="info-card inline-block">
          <p className="text-sm">💡 请先在"导入代币"页面添加需要的代币对</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
          <span>💧</span> 流动性管理
        </h2>
        <p className="text-secondary text-sm">
          添加或移除流动性以赚取交易手续费
        </p>
      </div>

      {/* 模式切换 */}
      <div className="tab-container">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setMode("add")}
            className={`tab-button ${mode === "add" ? "active" : ""}`}
          >
            <span>➕</span>添加流动性
          </button>
          <button
            onClick={() => setMode("remove")}
            className={`tab-button ${mode === "remove" ? "active" : ""}`}
          >
            <span>➖</span>移除流动性
          </button>
        </div>
      </div>

      {/* 代币选择 */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-primary mb-3">
              代币 A
            </label>
            <select
              value={tokenA?.address || ""}
              onChange={(e) => {
                const token = importedTokens.find(
                  (t) => t.address === e.target.value
                );
                setTokenA(token || null);
              }}
              className="dapp-select"
              disabled={loading}
            >
              <option value="">选择代币</option>
              {importedTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.name} ({token.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-3">
              代币 B
            </label>
            <select
              value={tokenB?.address || ""}
              onChange={(e) => {
                const token = importedTokens.find(
                  (t) => t.address === e.target.value
                );
                setTokenB(token || null);
              }}
              className="dapp-select"
              disabled={loading}
            >
              <option value="">选择代币</option>
              {importedTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.name} ({token.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* LP代币余额显示 */}
        {tokenA && tokenB && tokenA.address !== tokenB.address && (
          <div className="success-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">LP代币余额:</span>
              <span className="text-sm font-mono">
                {parseFloat(lpTokenBalance).toFixed(6)} {tokenA.symbol}-
                {tokenB.symbol}
              </span>
            </div>
          </div>
        )}
      </div>

      {mode === "add" ? (
        // 添加流动性界面
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-3">
                {tokenA?.symbol || "代币A"} 数量
              </label>
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                placeholder="0.0"
                className="dapp-input"
                disabled={loading || !tokenA}
              />
              {tokenA && (
                <div className="text-xs text-muted mt-2">
                  余额:{" "}
                  {parseFloat(tokenBalances[tokenA.address] || "0").toFixed(4)}{" "}
                  {tokenA.symbol}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-3">
                {tokenB?.symbol || "代币B"} 数量
              </label>
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                placeholder="0.0"
                className="dapp-input"
                disabled={loading || !tokenB}
              />
              {tokenB && (
                <div className="text-xs text-muted mt-2">
                  余额:{" "}
                  {parseFloat(tokenBalances[tokenB.address] || "0").toFixed(4)}{" "}
                  {tokenB.symbol}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleAddLiquidity}
            disabled={
              loading ||
              !tokenA ||
              !tokenB ||
              !amountA ||
              !amountB ||
              tokenA.address === tokenB.address
            }
            className="btn-success w-full"
          >
            {loading && <div className="loading-spinner"></div>}
            {loading ? "添加中..." : "添加流动性"}
          </button>
        </div>
      ) : (
        // 移除流动性界面
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-primary mb-4">
              移除比例
            </label>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {["25", "50", "75", "100"].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRemovePercentage(value)}
                    className={`px-6 py-2 text-sm rounded-lg transition-all font-medium ${
                      removePercentage === value
                        ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg"
                        : "bg-white/10 text-muted hover:text-secondary hover:bg-white/15 border border-white/20"
                    }`}
                    disabled={loading}
                  >
                    {value}%
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={removePercentage}
                onChange={(e) => setRemovePercentage(e.target.value)}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${removePercentage}%, rgba(255,255,255,0.2) ${removePercentage}%, rgba(255,255,255,0.2) 100%)`,
                }}
              />
              <div className="text-center">
                <span className="text-lg font-semibold text-primary">
                  移除 {removePercentage}% 的流动性
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRemoveLiquidity}
            disabled={
              loading ||
              !tokenA ||
              !tokenB ||
              tokenA.address === tokenB.address ||
              parseFloat(lpTokenBalance) === 0
            }
            className="btn-error w-full"
          >
            {loading && <div className="loading-spinner"></div>}
            {loading ? "移除中..." : "移除流动性"}
          </button>
        </div>
      )}

      {/* 提示信息 */}
      <div className="info-card">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div className="text-sm">
            <p className="font-medium mb-1">流动性说明：</p>
            <ul className="space-y-1 text-xs opacity-90">
              <li>• 添加流动性将获得LP代币，代表您在池中的份额</li>
              <li>• 移除流动性会销毁LP代币并返还对应的代币对</li>
              <li>• 首次添加流动性需要授权两个代币给路由器合约</li>
              <li>• 流动性提供者可以赚取交易对的手续费收入</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiquidityInterface;
