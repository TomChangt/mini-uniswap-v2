import React, { useState } from "react";
import { useWeb3 } from "../contexts/Web3Context";
import { useNotification } from "../contexts/NotificationContext";

interface TokenBalanceProps {
  tokenName: "TokenA" | "TokenB";
  displayName: string;
  symbolName: string;
}

const TokenBalance: React.FC<TokenBalanceProps> = ({
  tokenName,
  displayName,
  symbolName,
}) => {
  const {
    tokenAContract,
    tokenBContract,
    isConnected,
    tokenABalance,
    tokenBBalance,
    refreshTokenBalances,
  } = useWeb3();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);

  const contract = tokenName === "TokenA" ? tokenAContract : tokenBContract;
  const balance = tokenName === "TokenA" ? tokenABalance : tokenBBalance;

  const handleFaucet = async () => {
    if (!contract) return;

    setLoading(true);
    try {
      const tx = await contract.faucet();
      const receipt = await tx.wait();
      console.log(`${tokenName} 水龙头成功! 交易哈希:`, receipt?.hash);

      // 延迟刷新余额
      setTimeout(async () => {
        await refreshTokenBalances();
      }, 1000);

      showSuccess(
        "水龙头成功! 🎉",
        `成功获得 1000 ${displayName} 代币，已添加到您的钱包中`
      );
    } catch (error: any) {
      console.error("水龙头失败:", error);
      showError(
        "水龙头失败 😞",
        `获取代币失败: ${error.message || "未知错误"}`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="text-gray-500">请先连接钱包</div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 card-animation hover:scale-105 transition-transform duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              tokenName === "TokenA"
                ? "bg-gradient-to-r from-blue-500 to-purple-500"
                : "bg-gradient-to-r from-pink-500 to-red-500"
            }`}
          >
            <span className="text-white font-bold text-sm">
              {tokenName === "TokenA" ? "🔷" : "🔶"}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-100">
            {displayName}
          </h3>
        </div>
        <span className="text-sm text-slate-300 bg-white/15 px-2 py-1 rounded-full">
          {symbolName}
        </span>
      </div>

      <div className="mb-4">
        <div className="text-sm text-slate-300 mb-1">余额</div>
        <div className="text-2xl font-bold balance-text">
          {loading ? (
            <div className="flex items-center">
              <div className="loading-spinner"></div>
              加载中...
            </div>
          ) : (
            `${parseFloat(balance).toFixed(2)} ${displayName}`
          )}
        </div>
      </div>

      <button
        onClick={handleFaucet}
        disabled={loading || !contract}
        className={`w-full gradient-button success-button transition-all duration-300 ${
          loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg"
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="loading-spinner"></div>
            处理中...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="mr-2">💧</span>
            获取测试代币
          </div>
        )}
      </button>
    </div>
  );
};

export default TokenBalance;
