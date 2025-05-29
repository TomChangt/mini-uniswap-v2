import React, { useState } from "react";
import { TokenStorage } from "../utils/tokenStorage";

interface TokenStorageManagerProps {
  onTokensChanged: () => void;
}

const TokenStorageManager: React.FC<TokenStorageManagerProps> = ({
  onTokensChanged,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [importData, setImportData] = useState("");
  const [showImport, setShowImport] = useState(false);

  const storageInfo = TokenStorage.getStorageInfo();

  const handleExport = () => {
    const data = TokenStorage.exportTokens();
    // 复制到剪贴板
    navigator.clipboard.writeText(data).then(() => {
      alert("代币数据已复制到剪贴板！");
    });
  };

  const handleImport = () => {
    if (importData.trim()) {
      const success = TokenStorage.importTokens(importData);
      if (success) {
        alert("代币数据导入成功！");
        setImportData("");
        setShowImport(false);
        onTokensChanged();
      } else {
        alert("导入失败，请检查数据格式！");
      }
    }
  };

  const handleClearAll = () => {
    if (window.confirm("确定要清空所有已导入的代币吗？此操作不可撤销。")) {
      TokenStorage.clearAllTokens();
      onTokensChanged();
    }
  };

  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-slate-300 hover:text-slate-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs">💾</span>
          <span className="text-xs font-medium">存储管理</span>
        </div>
        <span className="text-xs">
          {isExpanded ? "▼" : "▶"} {storageInfo.count} 个代币
        </span>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          {/* 存储信息 */}
          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>代币数量:</span>
              <span className="text-slate-300">{storageInfo.count}</span>
            </div>
            <div className="flex justify-between">
              <span>存储大小:</span>
              <span className="text-slate-300">{storageInfo.size}</span>
            </div>
            {storageInfo.lastUpdated && (
              <div className="flex justify-between">
                <span>最后更新:</span>
                <span className="text-slate-300 truncate ml-2">
                  {storageInfo.lastUpdated}
                </span>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExport}
              className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded transition-colors"
            >
              📤 导出
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2 py-1 rounded transition-colors"
            >
              📥 导入
            </button>
          </div>

          {/* 导入区域 */}
          {showImport && (
            <div className="space-y-2">
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="粘贴导出的代币数据..."
                className="w-full h-16 text-xs bg-white/10 border border-white/20 text-slate-100 placeholder-slate-400 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="flex-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2 py-1 rounded transition-colors disabled:opacity-50"
                >
                  确认导入
                </button>
                <button
                  onClick={() => setShowImport(false)}
                  className="text-xs bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 px-2 py-1 rounded transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 危险操作 */}
          <div className="border-t border-red-500/20 pt-2">
            <button
              onClick={handleClearAll}
              className="w-full text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded transition-colors"
            >
              🗑️ 清空所有数据
            </button>
          </div>

          {/* 提示信息 */}
          <div className="text-xs text-slate-500 bg-white/5 rounded p-2">
            💡 数据保存在浏览器本地存储中，清除浏览器数据会丢失代币列表
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenStorageManager;
