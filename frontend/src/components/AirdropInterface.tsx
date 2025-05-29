import React, { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../contexts/Web3Context";
import { useNotification } from "../contexts/NotificationContext";

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
}

interface AirdropInterfaceProps {
  importedTokens: TokenInfo[];
  onBalanceUpdate?: () => void;
}

const AirdropInterface: React.FC<AirdropInterfaceProps> = ({
  importedTokens,
  onBalanceUpdate,
}) => {
  const { provider, account, isConnected, tokenBalances } = useWeb3();
  const { addNotification } = useNotification();
  const [selectedToken, setSelectedToken] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const ERC20_ABI = [
    "function owner() view returns (address)",
    "function airdropSingle(address recipient, uint256 amount) external",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint256)",
  ];

  const handleAirdrop = async () => {
    if (!provider || !account) {
      addNotification({
        type: "error",
        title: "连接错误",
        message: "请先连接钱包",
      });
      return;
    }

    if (!selectedToken) {
      addNotification({
        type: "error",
        title: "选择代币",
        message: "请选择要空投的代币",
      });
      return;
    }

    if (!ethers.isAddress(recipientAddress)) {
      addNotification({
        type: "error",
        title: "地址无效",
        message: "请输入有效的接收地址",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      addNotification({
        type: "error",
        title: "数量无效",
        message: "请输入有效的空投数量",
      });
      return;
    }

    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(
        selectedToken,
        ERC20_ABI,
        signer
      );

      // 检查是否是代币所有者
      try {
        const owner = await tokenContract.owner();
        if (owner.toLowerCase() !== account.toLowerCase()) {
          addNotification({
            type: "error",
            title: "权限不足",
            message: "只有代币所有者才能执行空投",
          });
          return;
        }
      } catch (ownerError) {
        console.error("检查所有者失败:", ownerError);
        addNotification({
          type: "error",
          title: "验证失败",
          message: "无法验证代币所有权，请确保这是一个有效的代币合约",
        });
        return;
      }

      const decimals = await tokenContract.decimals();
      const symbol = await tokenContract.symbol();
      const airdropAmount = ethers.parseUnits(amount, decimals);

      // 执行空投
      addNotification({
        type: "info",
        title: "执行中",
        message: "正在执行空投，请确认交易...",
      });

      const tx = await tokenContract.airdropSingle(
        recipientAddress,
        airdropAmount
      );
      console.log("空投交易发送:", tx.hash);

      await tx.wait();

      addNotification({
        type: "success",
        title: "空投成功",
        message: `成功空投 ${amount} ${symbol} 到 ${recipientAddress.slice(
          0,
          6
        )}...${recipientAddress.slice(-4)}`,
      });
      setAmount("");
      setRecipientAddress("");
      onBalanceUpdate?.();
    } catch (error: any) {
      console.error("空投失败:", error);
      if (error.reason) {
        addNotification({
          type: "error",
          title: "空投失败",
          message: error.reason,
        });
      } else if (error.message.includes("user rejected")) {
        addNotification({
          type: "warning",
          title: "交易取消",
          message: "用户取消了交易",
        });
      } else {
        addNotification({
          type: "error",
          title: "空投失败",
          message: "空投失败，请检查网络连接和账户余额",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedTokenInfo = importedTokens.find(
    (token) => token.address === selectedToken
  );

  const quickFillAddress = () => {
    if (account) {
      setRecipientAddress(account);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
          <span className="text-3xl">🔗</span>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          连接钱包开始
        </h3>
        <p className="text-secondary text-sm">请先连接您的钱包以执行空投操作</p>
      </div>
    );
  }

  if (importedTokens.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
          <span className="text-3xl">📝</span>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          暂无可用代币
        </h3>
        <p className="text-secondary text-sm mb-4">
          需要先导入代币才能执行空投操作
        </p>
        <div className="info-card inline-block">
          <p className="text-sm">💡 请先在"导入代币"页面添加需要空投的代币</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
          <span>💰</span> 代币空投
        </h2>
        <p className="text-secondary text-sm">
          向指定地址空投代币（仅代币所有者可操作）
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-primary mb-3">
            选择代币
          </label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="dapp-select"
            disabled={loading}
          >
            <option value="">选择要空投的代币</option>
            {importedTokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.name} ({token.symbol})
              </option>
            ))}
          </select>
        </div>

        {selectedTokenInfo && (
          <div className="success-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">当前余额:</span>
              <span className="text-sm font-mono">
                {parseFloat(
                  tokenBalances[selectedTokenInfo.address] || "0"
                ).toFixed(4)}{" "}
                {selectedTokenInfo.symbol}
              </span>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-primary">
              接收地址
            </label>
            <button
              onClick={quickFillAddress}
              className="text-xs text-accent hover:text-blue-300 transition-colors"
              disabled={loading}
            >
              填入我的地址
            </button>
          </div>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x... 接收空投的钱包地址"
            className="dapp-input"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-primary mb-3">
            空投数量
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.01"
            min="0"
            className="dapp-input"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleAirdrop}
          disabled={loading || !selectedToken || !recipientAddress || !amount}
          className="btn-success w-full"
        >
          {loading && <div className="loading-spinner"></div>}
          {loading ? "空投中..." : "执行空投"}
        </button>

        <div className="warning-card">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="text-sm">
              <p className="font-medium mb-1">空投须知：</p>
              <ul className="space-y-1 text-xs opacity-90">
                <li>• 只有代币合约的所有者才能执行空投</li>
                <li>• 请确保合约中有足够的代币余额</li>
                <li>• 空投操作需要支付网络手续费</li>
                <li>• 请仔细核对接收地址，操作不可撤销</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirdropInterface;
