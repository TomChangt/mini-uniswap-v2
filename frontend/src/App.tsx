import React, { useState, useEffect } from "react";
import { Web3Provider } from "./contexts/Web3Context";
import { NotificationProvider } from "./contexts/NotificationContext";
import WalletConnect from "./components/WalletConnect";
import TokenImport from "./components/TokenImport";
import SwapInterface from "./components/SwapInterface";
import LiquidityInterface from "./components/LiquidityInterface";
import AirdropInterface from "./components/AirdropInterface";
import PoolsInterface from "./components/PoolsInterface";
import NetworkStatus from "./components/NetworkStatus";
import TokenStorageManager from "./components/TokenStorageManager";
import NotificationContainer from "./components/NotificationContainer";
import { useWeb3 } from "./contexts/Web3Context";
import { TokenStorage, TokenInfo } from "./utils/tokenStorage";
import "./App.css";

function AppContent() {
  const [activeTab, setActiveTab] = useState<
    "import" | "swap" | "liquidity" | "pools" | "airdrop"
  >("import");
  const [importedTokens, setImportedTokens] = useState<TokenInfo[]>([]);
  const { account, tokenBalances, refreshAllTokenBalances } = useWeb3();

  // 初始化时从本地存储读取已导入的代币
  useEffect(() => {
    const loadedTokens = TokenStorage.loadTokens();
    setImportedTokens(loadedTokens);
  }, []);

  const handleTokenImported = (token: TokenInfo) => {
    const newTokens = TokenStorage.addToken(token);
    setImportedTokens(newTokens);
    TokenStorage.updateTimestamp();
  };

  // 删除已导入的代币
  const handleTokenRemoved = (tokenAddress: string) => {
    const newTokens = TokenStorage.removeToken(tokenAddress);
    setImportedTokens(newTokens);
    TokenStorage.updateTimestamp();
  };

  // 清空所有已导入的代币
  const handleClearAllTokens = () => {
    if (window.confirm("确定要清空所有已导入的代币吗？此操作不可撤销。")) {
      TokenStorage.clearAllTokens();
      setImportedTokens([]);
    }
  };

  // 处理存储变化（用于导入/导出功能）
  const handleStorageChanged = () => {
    const loadedTokens = TokenStorage.loadTokens();
    setImportedTokens(loadedTokens);
  };

  // 处理余额更新（空投成功后调用）
  const handleBalanceUpdate = async () => {
    if (refreshAllTokenBalances) {
      await refreshAllTokenBalances();
    }
  };

  return (
    <div className="min-h-screen relative">
      <header className="glass-card mx-4 mt-4 card-animation">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">🦄</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  Mini Uniswap V2
                </h1>
                <span className="text-sm text-secondary">
                  专业级去中心化交易所 · 多代币支持
                </span>
              </div>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="space-y-6">
            <div className="glass-card p-6 card-animation">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-primary flex items-center">
                  <span className="status-indicator status-online"></span>
                  已导入代币
                </h2>
                {importedTokens.length > 0 && (
                  <button
                    onClick={handleClearAllTokens}
                    className="text-xs text-muted hover:text-error transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    title="清空所有代币"
                  >
                    清空
                  </button>
                )}
              </div>
              {importedTokens.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-content">
                    <span className="text-2xl mx-auto">📝</span>
                  </div>
                  <p className="text-secondary text-sm font-medium mb-1">
                    暂无导入的代币
                  </p>
                  <p className="text-muted text-xs mb-3">
                    请先导入代币地址开始交易
                  </p>
                  <div className="info-card text-xs">
                    💾 已导入的代币会自动保存到本地
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {importedTokens.map((token) => (
                    <div
                      key={token.address}
                      className="bg-white/5 hover:bg-white/8 rounded-xl p-4 group transition-all duration-300 border border-transparent hover:border-white/10"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-primary font-semibold text-sm">
                            {token.symbol}
                          </p>
                          <p className="text-muted text-xs">{token.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-primary font-mono text-sm font-medium">
                            {tokenBalances[token.address]
                              ? parseFloat(
                                  tokenBalances[token.address]
                                ).toFixed(4)
                              : parseFloat(token.balance).toFixed(4)}
                          </p>
                          <div className="flex items-center justify-end space-x-2">
                            <p className="text-muted text-xs font-mono">
                              {token.address.slice(0, 6)}...
                              {token.address.slice(-4)}
                            </p>
                            <button
                              onClick={() => handleTokenRemoved(token.address)}
                              className="opacity-0 group-hover:opacity-100 text-error hover:text-red-400 text-xs transition-all px-1 py-1 rounded hover:bg-red-500/10"
                              title="删除代币"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="success-card text-center text-xs">
                    💾 共 {importedTokens.length} 个代币已安全保存
                  </div>
                </div>
              )}
            </div>

            {/* 存储管理器 */}
            <TokenStorageManager onTokensChanged={handleStorageChanged} />

            {account && (
              <div className="space-y-4">
                <NetworkStatus />
                <div className="glass-card p-4 card-animation">
                  <h3 className="text-sm font-semibold text-primary mb-3 flex items-center">
                    <span className="status-indicator status-online"></span>
                    连接状态
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary text-xs">状态</span>
                      <span className="text-success text-xs font-medium">
                        已连接
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary text-xs">地址</span>
                      <span className="text-accent text-xs font-mono">
                        {account.slice(0, 6)}...{account.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="tab-container mb-6 card-animation">
              <div className="grid grid-cols-5 gap-1">
                <button
                  onClick={() => setActiveTab("import")}
                  className={`tab-button ${
                    activeTab === "import" ? "active" : ""
                  }`}
                >
                  <span>📥</span>导入代币
                </button>
                <button
                  onClick={() => setActiveTab("swap")}
                  className={`tab-button ${
                    activeTab === "swap" ? "active" : ""
                  }`}
                >
                  <span>🔄</span>代币交换
                </button>
                <button
                  onClick={() => setActiveTab("liquidity")}
                  className={`tab-button ${
                    activeTab === "liquidity" ? "active" : ""
                  }`}
                >
                  <span>💧</span>流动性
                </button>
                <button
                  onClick={() => setActiveTab("pools")}
                  className={`tab-button ${
                    activeTab === "pools" ? "active" : ""
                  }`}
                >
                  <span>🏦</span>资金池
                </button>
                <button
                  onClick={() => setActiveTab("airdrop")}
                  className={`tab-button ${
                    activeTab === "airdrop" ? "active" : ""
                  }`}
                >
                  <span>💰</span>空投
                </button>
              </div>
            </div>

            <div className="glass-card p-6 card-animation min-h-[600px]">
              {activeTab === "import" && (
                <TokenImport
                  onTokenImported={handleTokenImported}
                  importedTokens={importedTokens}
                />
              )}
              {activeTab === "swap" && (
                <SwapInterface
                  importedTokens={importedTokens}
                  onBalanceUpdate={handleBalanceUpdate}
                />
              )}
              {activeTab === "liquidity" && (
                <LiquidityInterface
                  importedTokens={importedTokens}
                  onBalanceUpdate={handleBalanceUpdate}
                />
              )}
              {activeTab === "pools" && (
                <PoolsInterface importedTokens={importedTokens} />
              )}
              {activeTab === "airdrop" && (
                <AirdropInterface
                  importedTokens={importedTokens}
                  onBalanceUpdate={handleBalanceUpdate}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <NotificationContainer />
    </div>
  );
}

function App() {
  return (
    <Web3Provider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </Web3Provider>
  );
}

export default App;
