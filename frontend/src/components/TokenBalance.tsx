import React, { useState, useEffect } from "react";
import { useWeb3 } from "../contexts/Web3Context";
import { TokenInfo } from "../utils/tokenStorage";

interface TokenBalanceProps {
  tokens: TokenInfo[];
  onRefresh?: () => void;
}

const TokenBalance: React.FC<TokenBalanceProps> = ({ tokens, onRefresh }) => {
  const { getTokenBalance, account, isConnected } = useWeb3();
  const [balances, setBalances] = useState<{ [address: string]: string }>({});
  const [loading, setLoading] = useState(false);

  // 刷新所有代币余额
  const refreshBalances = async () => {
    if (!account || !isConnected || tokens.length === 0) return;

    setLoading(true);
    try {
      const newBalances: { [address: string]: string } = {};

      await Promise.all(
        tokens.map(async (token) => {
          try {
            const balance = await getTokenBalance(token.address);
            newBalances[token.address] = balance;
          } catch (error) {
            console.error(`获取 ${token.symbol} 余额失败:`, error);
            newBalances[token.address] = "0";
          }
        })
      );

      setBalances(newBalances);
      onRefresh?.();
    } catch (error) {
      console.error("刷新余额失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和定时刷新
  useEffect(() => {
    refreshBalances();

    // 每30秒自动刷新一次
    const interval = setInterval(refreshBalances, 30000);
    return () => clearInterval(interval);
  }, [tokens, account, isConnected]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary flex items-center">
          <span className="status-indicator status-online"></span>
          代币余额
        </h3>
        <button
          onClick={refreshBalances}
          disabled={loading}
          className="text-xs text-accent hover:text-blue-300 transition-colors disabled:opacity-50 p-1 rounded hover:bg-white/10"
          title="刷新余额"
        >
          {loading ? "🔄" : "↻"}
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-r from-gray-500/20 to-slate-500/20 flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <p className="text-muted text-sm">暂无代币余额</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((token) => (
            <div
              key={token.address}
              className="bg-white/5 hover:bg-white/8 rounded-lg p-3 group transition-all duration-300 border border-transparent hover:border-white/10"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-primary text-sm font-semibold">
                    {token.symbol}
                  </span>
                  <span className="text-muted text-xs font-mono">
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-primary font-mono text-sm font-medium">
                    {loading ? (
                      <span className="text-muted">...</span>
                    ) : (
                      parseFloat(balances[token.address] || "0").toFixed(4)
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="info-card text-center">
        <div className="text-xs">
          {loading ? (
            <span className="flex items-center justify-center gap-1">
              <div className="loading-spinner w-3 h-3"></div>
              更新中...
            </span>
          ) : (
            "💾 每30秒自动更新余额"
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenBalance;
