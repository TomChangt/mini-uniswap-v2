import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../contexts/Web3Context";
import { useNotification } from "../contexts/NotificationContext";
import { TokenInfo } from "../utils/tokenStorage";
import {
  PathFinder,
  SwapPath,
  formatPathDisplay,
  calculateMinOutput,
} from "../utils/pathFinder";

interface SwapInterfaceProps {
  importedTokens: TokenInfo[];
  onBalanceUpdate?: () => void;
}

const SwapInterface: React.FC<SwapInterfaceProps> = ({
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

  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [slippage, setSlippage] = useState("0.5");

  // 多路径相关状态
  const [availablePaths, setAvailablePaths] = useState<SwapPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<SwapPath | null>(null);
  const [pathFinderEnabled, setPathFinderEnabled] = useState(true);
  const [showPathDetails, setShowPathDetails] = useState(false);

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  // 创建路径查找器实例
  const pathFinder = useCallback(() => {
    if (!factoryContract || !routerContract) return null;
    return new PathFinder(factoryContract, routerContract, importedTokens);
  }, [factoryContract, routerContract, importedTokens]);

  // 计算输出金额（传统直接路径方式）
  const calculateOutputAmount = useCallback(
    async (inputAmount: string) => {
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

        // 创建直接路径对象
        const directPath: SwapPath = {
          path,
          tokens: [fromToken, toToken],
          expectedOutput: amountOut,
          priceImpact: 0,
        };
        setSelectedPath(directPath);
        setAvailablePaths([directPath]);
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
    },
    [routerContract, fromToken, toToken, addNotification]
  );

  // 查找所有可能的交换路径
  const findSwapPaths = useCallback(
    async (inputAmount: string) => {
      if (
        !fromToken ||
        !toToken ||
        !inputAmount ||
        inputAmount === "0" ||
        !pathFinderEnabled
      ) {
        setAvailablePaths([]);
        setSelectedPath(null);
        setToAmount("");
        return;
      }

      const finder = pathFinder();
      if (!finder) return;

      try {
        setCalculating(true);
        console.log(
          `🔍 查找 ${fromToken.symbol} → ${toToken.symbol} 的交换路径...`
        );

        const paths = await finder.findAllPaths(
          fromToken,
          toToken,
          inputAmount,
          {
            maxHops: 3,
            maxPaths: 5,
            slippageTolerance: parseFloat(slippage),
          }
        );

        console.log(`✅ 找到 ${paths.length} 条可用路径:`, paths);

        setAvailablePaths(paths);

        // 自动选择最优路径
        if (paths.length > 0) {
          const bestPath = paths[0];
          setSelectedPath(bestPath);
          setToAmount(bestPath.expectedOutput);

          console.log(`🎯 选择最优路径: ${formatPathDisplay(bestPath)}`);
          console.log(
            `📈 预期输出: ${bestPath.expectedOutput} ${toToken.symbol}`
          );
          console.log(`💥 价格影响: ${bestPath.priceImpact.toFixed(2)}%`);
        } else {
          setSelectedPath(null);
          setToAmount("");
          addNotification({
            type: "warning",
            title: "未找到路径",
            message: "没有找到可用的交换路径，可能缺少流动性",
          });
        }
      } catch (error) {
        console.error("路径查找失败:", error);
        setAvailablePaths([]);
        setSelectedPath(null);
        setToAmount("");
        addNotification({
          type: "error",
          title: "路径查找失败",
          message: "查找交换路径时发生错误",
        });
      } finally {
        setCalculating(false);
      }
    },
    [
      fromToken,
      toToken,
      pathFinder,
      slippage,
      pathFinderEnabled,
      addNotification,
    ]
  );

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
      !selectedPath
    ) {
      addNotification({
        type: "error",
        title: "信息不完整",
        message: "请填写完整的交换信息并选择路径",
      });
      return;
    }

    // 验证交换路径
    if (selectedPath.path.length < 2) {
      addNotification({
        type: "error",
        title: "路径无效",
        message: "交换路径无效，请重新选择",
      });
      return;
    }

    // 检查循环路径
    const uniqueAddresses = new Set(selectedPath.path);
    if (uniqueAddresses.size !== selectedPath.path.length) {
      addNotification({
        type: "error",
        title: "路径错误",
        message: "检测到循环路径，请等待系统重新计算",
      });
      // 重新计算路径
      if (pathFinderEnabled) {
        findSwapPaths(fromAmount);
      } else {
        calculateOutputAmount(fromAmount);
      }
      return;
    }

    setLoading(true);

    try {
      console.log("🚀 开始执行交换");
      console.log("- 从代币:", fromToken.symbol, fromToken.address);
      console.log("- 到代币:", toToken.symbol, toToken.address);
      console.log("- 输入金额:", fromAmount);
      console.log("- 路径:", formatPathDisplay(selectedPath));
      console.log("- 预期输出:", selectedPath.expectedOutput);

      // 1. 检查并授权代币
      console.log("📝 检查代币授权...");
      const approved = await checkAndApproveToken(fromToken, fromAmount);
      if (!approved) {
        setLoading(false);
        return;
      }

      // 2. 计算最小输出金额（考虑滑点）
      const minAmountOut = calculateMinOutput(
        selectedPath.expectedOutput,
        parseFloat(slippage),
        toToken.decimals
      );

      console.log("💰 交换参数:");
      console.log(
        "- 最小输出:",
        ethers.formatUnits(minAmountOut, toToken.decimals),
        toToken.symbol
      );
      console.log("- 滑点容忍:", slippage + "%");

      // 3. 准备交换参数
      const amountIn = ethers.parseUnits(fromAmount, fromToken.decimals);
      const to = await signer.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟后过期

      addNotification({
        type: "info",
        title: "交换中",
        message: `正在通过路径 ${formatPathDisplay(selectedPath)} 执行交换...`,
      });

      // 4. 执行交换
      console.log("🔄 调用合约执行交换...");
      const swapTx = await routerContract.swapExactTokensForTokens(
        amountIn,
        minAmountOut,
        selectedPath.path,
        to,
        deadline
      );

      console.log("⏳ 等待交易确认...", swapTx.hash);
      const receipt = await swapTx.wait();
      console.log("✅ 交易已确认:", receipt.hash);

      addNotification({
        type: "success",
        title: "交换成功",
        message: `通过 ${formatPathDisplay(selectedPath)} 成功交换代币！`,
      });

      // 5. 重置表单
      setFromAmount("");
      setToAmount("");
      setAvailablePaths([]);
      setSelectedPath(null);

      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    } catch (error: any) {
      console.error("❌ 交换失败:", error);

      let errorMessage = "代币交换失败";
      let errorTitle = "交换失败";

      // 解析具体错误原因
      if (error?.message) {
        if (error.message.includes("INSUFFICIENT_OUTPUT_AMOUNT")) {
          errorTitle = "滑点过高";
          errorMessage = "价格变动过大，请增加滑点容忍度或减少交换金额";
        } else if (error.message.includes("INSUFFICIENT_LIQUIDITY")) {
          errorTitle = "流动性不足";
          errorMessage = "当前交易对流动性不足，请选择其他路径或减少交换金额";
        } else if (error.message.includes("TRANSFER_FROM_FAILED")) {
          errorTitle = "授权失败";
          errorMessage = "代币转账失败，请检查代币授权";
        } else if (error.message.includes("EXPIRED")) {
          errorTitle = "交易过期";
          errorMessage = "交易时间过长，请重新尝试";
        } else if (error.message.includes("User denied")) {
          errorTitle = "用户取消";
          errorMessage = "您取消了交易";
        } else if (error.message.includes("insufficient funds")) {
          errorTitle = "余额不足";
          errorMessage = "账户余额不足以支付交易费用";
        }
      }

      addNotification({
        type: "error",
        title: errorTitle,
        message: errorMessage,
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
    setAvailablePaths([]);
    setSelectedPath(null);
  };

  // 手动选择路径
  const handleSelectPath = (path: SwapPath) => {
    setSelectedPath(path);
    setToAmount(path.expectedOutput);
    console.log(`🎯 手动选择路径: ${formatPathDisplay(path)}`);
  };

  // 设置最大金额
  const handleMaxAmount = () => {
    if (fromToken && tokenBalances[fromToken.address]) {
      setFromAmount(tokenBalances[fromToken.address]);
    }
  };

  // 当输入金额变化时计算输出
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromAmount && parseFloat(fromAmount) > 0) {
        if (pathFinderEnabled) {
          findSwapPaths(fromAmount);
        } else {
          calculateOutputAmount(fromAmount);
        }
      } else {
        setToAmount("");
        setAvailablePaths([]);
        setSelectedPath(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    fromAmount,
    fromToken,
    toToken,
    pathFinderEnabled,
    findSwapPaths,
    calculateOutputAmount,
  ]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-4">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center shadow-lg">
          <div className="text-4xl animate-bounce">🔗</div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">连接钱包开始交易</h3>
        <p className="text-gray-400 text-lg max-w-md">
          请先连接您的钱包以进行代币交换。享受去中心化交易的便捷体验！
        </p>
        <div className="mt-6 w-full max-w-xs h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (importedTokens.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-4">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center shadow-lg">
          <div className="text-4xl animate-pulse">📝</div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">需要更多代币</h3>
        <p className="text-gray-400 text-lg mb-6 max-w-md">
          至少需要导入 2 个代币才能进行交换
        </p>
        <div className="glass-card p-6 max-w-md">
          <p className="text-blue-400 flex items-center gap-2">
            <span>💡</span>
            请先在"导入代币"页面添加需要交换的代币
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="glass-card p-6 space-y-6 shadow-2xl">
        {/* 标题和智能路由开关 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🔄</span>
            </div>
            <h2 className="text-2xl font-bold text-white">代币交换</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 font-medium hidden sm:block">
              智能路由
            </span>
            <button
              onClick={() => setPathFinderEnabled(!pathFinderEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                pathFinderEnabled
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg"
                  : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all duration-300 shadow-lg ${
                  pathFinderEnabled ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 交换区域 */}
        <div className="space-y-6">
          {/* From Token */}
          <div className="group">
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              支付
            </label>
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl p-6 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-gray-400">
                  余额:{" "}
                  <span className="font-mono text-blue-400">
                    {fromToken
                      ? parseFloat(
                          tokenBalances[fromToken.address] || "0"
                        ).toFixed(4)
                      : "0.0000"}
                  </span>
                </div>
                {fromToken &&
                  parseFloat(tokenBalances[fromToken.address] || "0") > 0 && (
                    <button
                      onClick={handleMaxAmount}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20"
                    >
                      MAX
                    </button>
                  )}
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-3xl font-bold text-white placeholder-gray-500 focus:outline-none"
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
                  className="bg-gray-700/80 border border-gray-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] font-semibold backdrop-blur-sm"
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

          {/* 交换按钮 */}
          <div className="flex justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
            </div>
            <button
              onClick={handleReverseTokens}
              className="relative z-10 p-3 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 transition-all duration-300 hover:scale-110 hover:rotate-180 shadow-lg border border-gray-600/50"
              disabled={loading}
            >
              <svg
                className="w-5 h-5 text-gray-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="group">
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              接收
            </label>
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl p-6 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-gray-400">
                  余额:{" "}
                  <span className="font-mono text-blue-400">
                    {toToken
                      ? parseFloat(
                          tokenBalances[toToken.address] || "0"
                        ).toFixed(4)
                      : "0.0000"}
                  </span>
                </div>
                {calculating && (
                  <div className="flex items-center gap-2 text-xs text-blue-400">
                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    计算中...
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={toAmount}
                  placeholder={calculating ? "计算中..." : "0.0"}
                  className="flex-1 bg-transparent text-3xl font-bold text-white placeholder-gray-500 focus:outline-none"
                  readOnly
                />
                <select
                  value={toToken?.address || ""}
                  onChange={(e) => {
                    const token = importedTokens.find(
                      (t) => t.address === e.target.value
                    );
                    setToToken(token || null);
                  }}
                  className="bg-gray-700/80 border border-gray-600 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] font-semibold backdrop-blur-sm"
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
        </div>

        {/* 路径选择器 */}
        {pathFinderEnabled && availablePaths.length > 1 && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-2xl p-6 border border-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-semibold">🛣️ 可用路径</span>
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                  {availablePaths.length}
                </span>
              </div>
              <button
                onClick={() => setShowPathDetails(!showPathDetails)}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors font-medium"
              >
                {showPathDetails ? "隐藏详情" : "显示详情"}
              </button>
            </div>
            <div className="space-y-3">
              {availablePaths.map((path, index) => (
                <div
                  key={index}
                  className={`relative p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                    selectedPath === path
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-600/20 border-2 border-blue-500/50 shadow-lg"
                      : "bg-gray-700/30 border border-gray-600/50 hover:border-gray-500/50 hover:bg-gray-700/50"
                  }`}
                  onClick={() => handleSelectPath(path)}
                >
                  {selectedPath === path && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white mb-1">
                        {formatPathDisplay(path)}
                      </div>
                      {showPathDetails && (
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>
                            输出: {parseFloat(path.expectedOutput).toFixed(6)}{" "}
                            {toToken?.symbol}
                          </div>
                          <div
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              path.priceImpact > 5
                                ? "bg-red-500/20 text-red-400"
                                : path.priceImpact > 2
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            影响: {path.priceImpact.toFixed(2)}%
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {parseFloat(path.expectedOutput).toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {toToken?.symbol}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 滑点设置 */}
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl p-6 border border-gray-600/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-300 font-semibold">⚙️ 滑点容忍</span>
            <span className="text-xl font-bold text-blue-400">{slippage}%</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {["0.1", "0.5", "1.0", "2.0"].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  slippage === value
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/50"
                }`}
                disabled={loading}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              placeholder="自定义"
              className="px-4 py-3 bg-gray-700/50 border border-gray-600/50 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-center"
              disabled={loading}
              min="0.1"
              max="50"
              step="0.1"
            />
          </div>
        </div>

        {/* 交换详情 */}
        {selectedPath && fromAmount && toAmount && (
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-600/10 rounded-2xl p-6 border border-indigo-500/20">
            <h4 className="text-indigo-400 font-semibold mb-4 flex items-center gap-2">
              📊 交换详情
            </h4>
            <div className="space-y-3 text-sm">
              {pathFinderEnabled && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">交换路径:</span>
                  <span className="font-mono text-white bg-gray-700/50 px-3 py-1 rounded-lg">
                    {formatPathDisplay(selectedPath)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">交换比例:</span>
                <span className="font-mono text-white">
                  1 {fromToken?.symbol} ={" "}
                  {(
                    parseFloat(toAmount) / parseFloat(fromAmount || "1")
                  ).toFixed(6)}{" "}
                  {toToken?.symbol}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">最小接收:</span>
                <span className="font-mono text-green-400">
                  {(
                    parseFloat(toAmount) *
                    (1 - parseFloat(slippage) / 100)
                  ).toFixed(6)}{" "}
                  {toToken?.symbol}
                </span>
              </div>
              {pathFinderEnabled && selectedPath.priceImpact > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">价格影响:</span>
                  <span
                    className={`font-mono px-3 py-1 rounded-lg ${
                      selectedPath.priceImpact > 5
                        ? "bg-red-500/20 text-red-400"
                        : selectedPath.priceImpact > 2
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {selectedPath.priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}
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
            !selectedPath ||
            fromToken.address === toToken.address ||
            calculating
          }
          className={`w-full py-4 rounded-2xl text-lg font-bold transition-all duration-300 ${
            loading || calculating
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            {loading && (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
            {loading
              ? "交换中..."
              : calculating
              ? "查找最优路径..."
              : "🚀 立即交换"}
          </div>
        </button>

        {/* 提示信息 */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-600/10 rounded-2xl p-6 border border-emerald-500/20">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 text-lg">💡</span>
              <div>
                <span className="text-emerald-400 font-semibold">
                  智能路由:
                </span>
                <span className="text-gray-300 ml-2">
                  {pathFinderEnabled
                    ? "已开启，系统会自动寻找最优交换路径"
                    : "已关闭，仅使用直接交换路径"}
                </span>
              </div>
            </div>
            {pathFinderEnabled && (
              <>
                <div className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg">🔍</span>
                  <div>
                    <span className="text-blue-400 font-semibold">
                      路径查找:
                    </span>
                    <span className="text-gray-300 ml-2">
                      最多支持 3 跳交换，自动寻找 5 条最优路径
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-400 text-lg">🎯</span>
                  <div>
                    <span className="text-purple-400 font-semibold">
                      最优选择:
                    </span>
                    <span className="text-gray-300 ml-2">
                      基于最高输出自动选择最佳路径
                    </span>
                  </div>
                </div>
              </>
            )}
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 text-lg">⚠️</span>
              <div>
                <span className="text-yellow-400 font-semibold">注意事项:</span>
                <span className="text-gray-300 ml-2">
                  请确保滑点设置合理，避免交易失败
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapInterface;
