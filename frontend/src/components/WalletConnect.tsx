import React, { useState, useEffect } from "react";
import { useWeb3 } from "../contexts/Web3Context";

const WalletConnect: React.FC = () => {
  const {
    account,
    isConnected,
    connectWallet,
    disconnectWallet,
    getBalance,
    chainId,
  } = useWeb3();
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    const fetchBalance = async () => {
      if (account) {
        try {
          const bal = await getBalance(account);
          setBalance(bal);
        } catch (error) {
          console.error("获取余额失败:", error);
          setBalance("0");
        }
      } else {
        setBalance("0");
      }
    };

    fetchBalance();
  }, [account, getBalance, chainId]); // 添加 chainId 依赖

  // 手动刷新余额的函数
  const refreshBalance = async () => {
    if (account) {
      try {
        const bal = await getBalance(account);
        setBalance(bal);
      } catch (error) {
        console.error("刷新余额失败:", error);
      }
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 43114:
        return "Avalanche Mainnet";
      case 43113:
        return "Avalanche Fuji Testnet";
      case 31337:
        return "Hardhat Local";
      case 202505261834:
        return "Avalanche L1 Local";
      default:
        return "Unknown Network";
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        className="gradient-button px-6 py-3 text-sm font-semibold pulse-animation hover:scale-105 transition-all duration-300"
      >
        <span className="mr-2">🔗</span>
        连接钱包
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="glass-card p-3 text-sm">
        <div className="text-white/80 flex items-center mb-1">
          <span className="mr-2">🌐</span>
          {getNetworkName(chainId)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-300 flex items-center">
            <span className="mr-1">💎</span>
            {parseFloat(balance).toFixed(4)} AVAX
          </span>
          <button
            onClick={refreshBalance}
            className="text-blue-300 hover:text-blue-200 hover:scale-110 transition-all duration-200"
            title="刷新余额"
          >
            🔄
          </button>
        </div>
      </div>
      <div className="bg-white/20 backdrop-blur-lg px-4 py-2 rounded-xl border border-white/30">
        <span className="text-sm font-medium text-white flex items-center">
          <span className="mr-2">👤</span>
          {formatAddress(account!)}
        </span>
      </div>
      <button
        onClick={disconnectWallet}
        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-300 text-sm hover:shadow-lg hover:scale-105"
      >
        <span className="mr-1">🚪</span>
        断开
      </button>
    </div>
  );
};

export default WalletConnect;
