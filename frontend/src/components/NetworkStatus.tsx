import React from "react";
import { useWeb3 } from "../contexts/Web3Context";

const NetworkStatus: React.FC = () => {
  const { chainId, isConnected, switchToAvalanche } = useWeb3();

  // Avalanche L1 链 ID
  const AVALANCHE_L1_CHAIN_ID = 202505301220;
  const isCorrectNetwork = chainId === AVALANCHE_L1_CHAIN_ID;

  if (!isConnected) {
    return null;
  }

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 1:
        return "以太坊主网";
      case 3:
        return "Ropsten 测试网";
      case 4:
        return "Rinkeby 测试网";
      case 5:
        return "Goerli 测试网";
      case 31337:
        return "Hardhat 本地网络";
      case 43114:
        return "Avalanche 主网";
      case 43113:
        return "Avalanche Fuji 测试网";
      case AVALANCHE_L1_CHAIN_ID:
        return "Avalanche L1 本地网络";
      default:
        return `未知网络 (ID: ${chainId})`;
    }
  };

  const getNetworkStatus = () => {
    if (isCorrectNetwork) {
      return {
        status: "success",
        message: "已连接到正确网络",
        icon: "✅",
        bgColor: "bg-green-500/10",
        textColor: "text-green-400",
        borderColor: "border-green-500/20",
      };
    } else {
      return {
        status: "warning",
        message: "请切换到 Avalanche L1 网络",
        icon: "⚠️",
        bgColor: "bg-yellow-500/10",
        textColor: "text-yellow-400",
        borderColor: "border-yellow-500/20",
      };
    }
  };

  const networkStatus = getNetworkStatus();

  return (
    <div
      className={`${networkStatus.bgColor} ${networkStatus.borderColor} border rounded-lg p-3 mb-4`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{networkStatus.icon}</span>
          <div>
            <p className={`text-sm font-medium ${networkStatus.textColor}`}>
              {networkStatus.message}
            </p>
            <p className="text-xs text-slate-400">
              当前网络: {getNetworkName(chainId)}
            </p>
          </div>
        </div>

        {!isCorrectNetwork && (
          <button
            onClick={switchToAvalanche}
            className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-md text-sm transition-colors"
          >
            切换网络
          </button>
        )}
      </div>

      {isCorrectNetwork && (
        <div className="mt-2 p-2 bg-white/5 rounded text-xs text-slate-300">
          <p>📋 网络信息:</p>
          <p>• Chain ID: {AVALANCHE_L1_CHAIN_ID}</p>
          <p>• RPC: http://127.0.0.1:49370/ext/bc/...</p>
          <p>• 货币符号: AVX</p>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;
