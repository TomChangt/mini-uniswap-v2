import React, { useState } from "react";
import { Web3Provider } from "./contexts/Web3Context";
import { NotificationProvider } from "./contexts/NotificationContext";
import WalletConnect from "./components/WalletConnect";
import TokenBalance from "./components/TokenBalance";
import SwapInterface from "./components/SwapInterface";
import LiquidityInterface from "./components/LiquidityInterface";
import NotificationContainer from "./components/NotificationContainer";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<"swap" | "liquidity">("swap");

  return (
    <Web3Provider>
      <NotificationProvider>
        <div className="min-h-screen relative">
          {/* 头部导航 */}
          <header className="glass-card mx-4 mt-4 card-animation">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">🦄</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      Mini Uniswap V2
                    </h1>
                    <span className="text-sm text-white/70">
                      去中心化交易所
                    </span>
                  </div>
                </div>
                <WalletConnect />
              </div>
            </div>
          </header>

          {/* 主要内容 */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* 左侧：代币余额 */}
              <div className="space-y-6">
                <div className="glass-card p-4 card-animation">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2 pulse-animation"></span>
                    代币余额
                  </h2>
                  <div className="space-y-4">
                    <TokenBalance tokenName="TokenA" />
                    <TokenBalance tokenName="TokenB" />
                  </div>
                </div>
              </div>

              {/* 中间：主要功能区 */}
              <div className="lg:col-span-3">
                {/* 功能标签 */}
                <div className="glass-card p-1 mb-6 card-animation">
                  <div className="flex relative">
                    <button
                      onClick={() => setActiveTab("swap")}
                      className={`flex-1 px-6 py-4 font-medium text-sm rounded-xl transition-all duration-300 ${
                        activeTab === "swap"
                          ? "bg-white/15 text-slate-100 shadow-lg"
                          : "text-slate-300 hover:text-slate-100 hover:bg-white/10"
                      }`}
                    >
                      <span className="mr-2">🔄</span>
                      代币交换
                    </button>
                    <button
                      onClick={() => setActiveTab("liquidity")}
                      className={`flex-1 px-6 py-4 font-medium text-sm rounded-xl transition-all duration-300 ${
                        activeTab === "liquidity"
                          ? "bg-white/15 text-slate-100 shadow-lg"
                          : "text-slate-300 hover:text-slate-100 hover:bg-white/10"
                      }`}
                    >
                      <span className="mr-2">💧</span>
                      流动性管理
                    </button>
                  </div>
                </div>

                {/* 功能内容 */}
                <div className="card-animation">
                  {activeTab === "swap" && <SwapInterface />}
                  {activeTab === "liquidity" && <LiquidityInterface />}
                </div>
              </div>
            </div>

            {/* 底部信息 */}
            <div className="mt-12 text-center">
              <div className="glass-card p-6 inline-block card-animation">
                <div className="flex items-center justify-center space-x-4 text-slate-200">
                  <span className="text-2xl">🛡️</span>
                  <div className="text-left">
                    <p className="font-semibold">
                      基于 UniswapV2 协议的去中心化交易所
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      安全 • 透明 • 去中心化
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* 通知容器 */}
          <NotificationContainer />
        </div>
      </NotificationProvider>
    </Web3Provider>
  );
}

export default App;
