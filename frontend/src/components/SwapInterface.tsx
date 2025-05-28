import React, { useState, useEffect } from "react";
import { useWeb3 } from "../contexts/Web3Context";
import { useNotification } from "../contexts/NotificationContext";
import { ethers } from "ethers";
import addresses from "../contracts/addresses.json";

const SwapInterface: React.FC = () => {
  const {
    account,
    tokenAContract,
    tokenBContract,
    routerContract,
    isConnected,
    tokenABalance,
    tokenBBalance,
    refreshTokenBalances,
  } = useWeb3();
  const { showSuccess, showError, showInfo } = useNotification();
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [fromToken, setFromToken] = useState<"TokenA" | "TokenB">("TokenA");
  const [slippage, setSlippage] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // 代币显示名称转换函数
  const getDisplayName = (tokenName: "TokenA" | "TokenB") => {
    return tokenName === "TokenA" ? "USDT" : "ETH";
  };

  const fromContract = fromToken === "TokenA" ? tokenAContract : tokenBContract;
  const fromAddress =
    fromToken === "TokenA" ? addresses.tokenA : addresses.tokenB;
  const toAddress =
    fromToken === "TokenA" ? addresses.tokenB : addresses.tokenA;

  // 余额已经由 Web3Context 统一管理，无需单独刷新

  useEffect(() => {
    const calculateOutput = async () => {
      if (!fromAmount || !routerContract || parseFloat(fromAmount) <= 0) {
        setToAmount("");
        return;
      }

      try {
        const amountIn = ethers.parseEther(fromAmount);
        const path = [fromAddress, toAddress];
        const amounts = await routerContract.getAmountsOut(amountIn, path);
        const amountOut = ethers.formatEther(amounts[1]);
        setToAmount(amountOut);
      } catch (error) {
        console.error("计算输出失败:", error);
        setToAmount("0");
      }
    };

    const timeoutId = setTimeout(calculateOutput, 500);
    return () => clearTimeout(timeoutId);
  }, [fromAmount, routerContract, fromAddress, toAddress]);

  const handleSwap = async () => {
    if (
      !fromContract ||
      !routerContract ||
      !account ||
      !fromAmount ||
      !toAmount
    ) {
      showError("参数错误", "请确保所有必要的参数都已提供");
      return;
    }

    setLoading(true);
    try {
      const amountIn = ethers.parseEther(fromAmount);
      const amountOutMin = ethers.parseEther(
        ((parseFloat(toAmount) * (100 - slippage)) / 100).toString()
      );
      const path = [fromAddress, toAddress];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟

      // 前置检查
      showInfo("正在执行前置检查 🔍", "检查余额和流动性...");

      // 检查用户余额
      const userBalance = await fromContract.balanceOf(account);
      if (userBalance < amountIn) {
        throw new Error(
          `余额不足，当前余额: ${ethers.formatEther(
            userBalance
          )} ${getDisplayName(fromToken)}`
        );
      }

      // 检查流动性
      showInfo("正在检查流动性 🔍", "检查流动性...");
      try {
        const expectedAmounts = await routerContract.getAmountsOut(
          amountIn,
          path
        );
        const expectedOutput = ethers.formatEther(expectedAmounts[1]);

        // 检查期望输出是否与计算的输出接近（允许1%误差）
        const outputDiff =
          Math.abs(parseFloat(expectedOutput) - parseFloat(toAmount)) /
          parseFloat(toAmount);
        if (outputDiff > 0.01) {
          showInfo("价格发生变化 📈", "重新计算最新价格...");
          setToAmount(expectedOutput);
          throw new Error("价格已发生变化，请确认新的输出数量后重试");
        }
      } catch (liquidityError: any) {
        if (liquidityError.message.includes("价格已发生变化")) {
          throw liquidityError;
        }
        throw new Error("流动性不足或交易对不存在");
      }

      // 检查授权
      showInfo("正在检查授权 🔍", "检查代币授权状态...");
      const allowance = await fromContract.allowance(account, addresses.router);
      if (allowance < amountIn) {
        showInfo(
          "正在授权代币 📝",
          `请在钱包中确认 ${getDisplayName(fromToken)} 授权交易...`
        );
        const approveTx = await fromContract.approve(
          addresses.router,
          ethers.MaxUint256
        );
        showInfo("等待授权确认 ⏳", "授权交易已提交，等待确认...");
        await approveTx.wait();
        showSuccess("授权成功 ✅", "代币授权已完成，现在可以进行交换");
      }

      // 执行交换
      showInfo("正在执行交换 ⚡", "请在钱包中确认交换交易...");
      const swapTx = await routerContract.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        account,
        deadline
      );

      showInfo("等待交易确认 ⏳", "交换交易已提交，等待确认...");
      const receipt = await swapTx.wait();
      console.log("交换成功! 交易哈希:", receipt?.hash);

      // 重置表单
      setFromAmount("");
      setToAmount("");

      // 延迟一下再刷新余额，确保状态更新
      setTimeout(async () => {
        await refreshTokenBalances();
      }, 1000);

      showSuccess(
        "交换成功! 🎉",
        `成功交换 ${fromAmount} ${getDisplayName(fromToken)} → ${parseFloat(
          toAmount
        ).toFixed(4)} ${getDisplayName(
          fromToken === "TokenA" ? "TokenB" : "TokenA"
        )}`
      );
    } catch (error: any) {
      console.error("交换失败:", error);

      // 更详细的错误处理
      let errorMessage = "未知错误，请重试";
      if (error.code === 4001) {
        errorMessage = "用户取消了交易";
      } else if (error.message.includes("INSUFFICIENT_OUTPUT_AMOUNT")) {
        errorMessage = `滑点过大，实际输出低于最小期望。建议增加滑点容忍度到 ${
          slippage + 1
        }% 或更高`;
      } else if (error.message.includes("INSUFFICIENT_LIQUIDITY")) {
        errorMessage = "流动性不足，请尝试减少交换数量";
      } else if (error.message.includes("TRANSFER_FROM_FAILED")) {
        errorMessage = "代币转账失败，请检查代币授权";
      } else if (error.message.includes("余额不足")) {
        errorMessage = error.message;
      } else if (error.message.includes("价格已发生变化")) {
        errorMessage = error.message;
      } else if (error.message.includes("流动性不足或交易对不存在")) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError("交换失败 😞", `操作失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchTokens = () => {
    setFromToken(fromToken === "TokenA" ? "TokenB" : "TokenA");
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleMaxClick = () => {
    const balance = fromToken === "TokenA" ? tokenABalance : tokenBBalance;
    setFromAmount(balance);
  };

  if (!isConnected) {
    return (
      <div className="glass-card p-6 card-animation">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center mr-3">
            <span className="text-white font-bold">🔄</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">代币交换</h2>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔐</div>
          <p className="text-slate-300 text-lg">请先连接钱包以开始交换</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 card-animation">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center mr-3">
          <span className="text-white font-bold">🔄</span>
        </div>
        <h2 className="text-xl font-bold text-slate-100">代币交换</h2>
      </div>

      {/* 滑点设置 */}
      <div className="mb-6 glass-card p-4">
        <label className="block text-sm font-medium text-slate-100 mb-3 flex items-center">
          <span className="mr-2">⚙️</span>
          滑点容忍度: {slippage}%
        </label>
        <div className="flex space-x-2">
          {[0.5, 1, 3, 5, 10].map((value) => (
            <button
              key={value}
              onClick={() => setSlippage(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                slippage === value
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "bg-white/15 text-slate-300 hover:bg-white/25 hover:text-slate-100"
              }`}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>

      {/* 输入代币 */}
      <div className="mb-4 glass-card p-4">
        <label className="block text-sm font-medium text-slate-100 mb-3 flex items-center">
          <span className="mr-2">{fromToken === "TokenA" ? "🔷" : "🔶"}</span>从
          ({getDisplayName(fromToken)})
        </label>
        <div className="relative">
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder="0.0"
            className="custom-input w-full pr-16"
          />
          <button
            onClick={handleMaxClick}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium px-3 py-1 rounded-full hover:shadow-lg transition-all duration-200"
          >
            MAX
          </button>
        </div>
        <div className="text-sm text-slate-300 mt-2 flex items-center">
          <span className="mr-1">💰</span>
          余额:{" "}
          {parseFloat(
            fromToken === "TokenA" ? tokenABalance : tokenBBalance
          ).toFixed(4)}
        </div>
      </div>

      {/* 切换按钮 */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleSwitchTokens}
          className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-pink-500 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110"
        >
          <span className="text-white text-xl">🔄</span>
        </button>
      </div>

      {/* 输出代币 */}
      <div className="mb-6 glass-card p-4">
        <label className="block text-sm font-medium text-slate-100 mb-3 flex items-center">
          <span className="mr-2">{fromToken === "TokenA" ? "🔶" : "🔷"}</span>到
          ({getDisplayName(fromToken === "TokenA" ? "TokenB" : "TokenA")})
        </label>
        <input
          type="number"
          value={toAmount}
          readOnly
          placeholder="0.0"
          className="custom-input w-full opacity-80 cursor-not-allowed"
        />
        <div className="text-sm text-slate-300 mt-2 flex items-center">
          <span className="mr-1">💰</span>
          余额:{" "}
          {parseFloat(
            fromToken === "TokenA" ? tokenBBalance : tokenABalance
          ).toFixed(4)}
        </div>
      </div>

      {/* 交换信息 */}
      {fromAmount && toAmount && (
        <div className="mb-6 glass-card p-4">
          <h3 className="text-sm font-medium text-slate-100 mb-3 flex items-center">
            <span className="mr-2">📊</span>
            交换详情
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">汇率:</span>
              <span className="text-slate-100 font-semibold">
                1 {getDisplayName(fromToken)} ={" "}
                {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)}{" "}
                {getDisplayName(fromToken === "TokenA" ? "TokenB" : "TokenA")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">最小获得:</span>
              <span className="text-green-400 font-semibold">
                {((parseFloat(toAmount) * (100 - slippage)) / 100).toFixed(6)}{" "}
                {getDisplayName(fromToken === "TokenA" ? "TokenB" : "TokenA")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 交换按钮 */}
      <button
        onClick={handleSwap}
        disabled={
          loading || !fromAmount || !toAmount || parseFloat(fromAmount) <= 0
        }
        className={`w-full gradient-button transition-all duration-300 py-4 ${
          loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl"
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="loading-spinner"></div>
            交换中...
          </div>
        ) : (
          <div className="flex items-center justify-center text-lg font-semibold">
            <span className="mr-2">⚡</span>
            立即交换
          </div>
        )}
      </button>
    </div>
  );
};

export default SwapInterface;
