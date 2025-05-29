import React, { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../contexts/Web3Context";
import { useNotification } from "../contexts/NotificationContext";
import { TokenInfo } from "../utils/tokenStorage";
import addresses from "../contracts/addresses.json";

interface TokenImportProps {
  onTokenImported: (token: TokenInfo) => void;
  importedTokens: TokenInfo[];
}

const TokenImport: React.FC<TokenImportProps> = ({
  onTokenImported,
  importedTokens,
}) => {
  const { provider, account, isConnected } = useWeb3();
  const { addNotification } = useNotification();
  const [tokenAddress, setTokenAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function description() view returns (string)",
  ];

  // 检查代币是否已经导入
  const isTokenImported = (address: string) => {
    return importedTokens.some(
      (token) => token.address.toLowerCase() === address.toLowerCase()
    );
  };

  const handleImportToken = async () => {
    if (!provider || !account) {
      addNotification({
        type: "error",
        title: "连接错误",
        message: "请先连接钱包",
      });
      return;
    }

    if (!ethers.isAddress(tokenAddress)) {
      addNotification({
        type: "error",
        title: "地址无效",
        message: "请输入有效的代币地址",
      });
      return;
    }

    // 检查是否已经导入过
    if (isTokenImported(tokenAddress)) {
      addNotification({
        type: "warning",
        title: "代币已存在",
        message: "该代币已经导入过了",
      });
      return;
    }

    setLoading(true);

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider
      );

      const [name, symbol, decimals, balance] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.balanceOf(account),
      ]);

      const tokenInfo: TokenInfo = {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        balance: ethers.formatUnits(balance, decimals),
      };

      onTokenImported(tokenInfo);
      addNotification({
        type: "success",
        title: "导入成功",
        message: `成功导入并保存代币: ${name} (${symbol})`,
      });
      setTokenAddress("");
    } catch (error) {
      console.error("导入代币失败:", error);
      addNotification({
        type: "error",
        title: "导入失败",
        message: "导入代币失败，请检查地址是否正确或合约是否支持 ERC20 标准",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickImport = (address: string, name: string) => {
    if (isTokenImported(address)) {
      addNotification({
        type: "warning",
        title: "代币已存在",
        message: `${name} 已经导入过了`,
      });
      return;
    }
    setTokenAddress(address);
  };

  // 预设的代币地址（使用实际部署的地址）
  const presetTokens = [
    { name: "USDT", address: addresses.tokens.USDT },
    { name: "ETH", address: addresses.tokens.ETH },
    { name: "AVAX", address: addresses.tokens.AVALANCHE },
    { name: "SOL", address: addresses.tokens.SOLANA },
  ];

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
          <span className="text-3xl">🔗</span>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          连接钱包开始
        </h3>
        <p className="text-secondary text-sm">请先连接您的钱包以导入代币</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
          <span>📥</span> 导入代币
        </h2>
        <p className="text-secondary text-sm">
          导入任意 ERC20 代币并自动保存到本地
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-primary mb-3">
            代币合约地址
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x... 输入完整的合约地址"
            className="dapp-input"
            disabled={loading}
          />
          {tokenAddress && isTokenImported(tokenAddress) && (
            <div className="mt-2 warning-card text-sm">
              ⚠️ 该代币已经导入过了
            </div>
          )}
        </div>

        <button
          onClick={handleImportToken}
          disabled={loading || !tokenAddress || isTokenImported(tokenAddress)}
          className="btn-primary w-full"
        >
          {loading && <div className="loading-spinner"></div>}
          {loading
            ? "导入中..."
            : isTokenImported(tokenAddress)
            ? "已导入"
            : "导入代币"}
        </button>

        <div className="border-t border-white/10 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <span>⚡</span> 快速导入
            </h3>
            <span className="text-xs text-muted bg-blue-500/10 px-2 py-1 rounded-full">
              Avalanche L1 网络
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {presetTokens.map((token) => {
              const imported = isTokenImported(token.address);
              return (
                <button
                  key={token.name}
                  onClick={() => handleQuickImport(token.address, token.name)}
                  disabled={loading || imported}
                  className={`text-sm py-3 transition-all ${
                    imported
                      ? "bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed"
                      : "btn-secondary"
                  }`}
                >
                  {imported ? `✓ ${token.name}` : token.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="info-card">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div className="text-sm">
              <p className="font-medium mb-1">导入说明：</p>
              <ul className="space-y-1 text-xs opacity-90">
                <li>• 导入的代币会自动保存到本地存储</li>
                <li>• 刷新页面不会丢失已导入的代币</li>
                <li>• 支持所有标准 ERC20 代币合约</li>
                <li>• 已导入的代币会显示 ✓ 标记</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenImport;
