import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../contexts/Web3Context";
import { useNotification } from "../contexts/NotificationContext";
import { TokenInfo } from "../utils/tokenStorage";

interface PoolsInterfaceProps {
  importedTokens: TokenInfo[];
}

interface PoolInfo {
  token0: TokenInfo;
  token1: TokenInfo;
  pairAddress: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  userLPBalance: string;
  userShare: string; // 用户在池中的份额百分比
}

const PoolsInterface: React.FC<PoolsInterfaceProps> = ({ importedTokens }) => {
  const { signer, factoryContract, isConnected } = useWeb3();
  const { addNotification } = useNotification();

  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const PAIR_ABI = [
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
  ];

  // 获取所有可能的交易对信息
  const fetchAllPools = async () => {
    if (!factoryContract || !signer || importedTokens.length < 2) {
      setPools([]);
      return;
    }

    setLoading(true);
    const foundPools: PoolInfo[] = [];

    try {
      console.log("🔍 开始检查交易对...");

      // 生成所有可能的代币对组合
      for (let i = 0; i < importedTokens.length; i++) {
        for (let j = i + 1; j < importedTokens.length; j++) {
          const tokenA = importedTokens[i];
          const tokenB = importedTokens[j];

          try {
            // 获取交易对地址
            const pairAddress = await factoryContract.getPair(
              tokenA.address,
              tokenB.address
            );

            // 如果交易对存在
            if (pairAddress !== ethers.ZeroAddress) {
              console.log(`✅ 发现交易对: ${tokenA.symbol}-${tokenB.symbol}`);

              const pairContract = new ethers.Contract(
                pairAddress,
                PAIR_ABI,
                signer
              );

              // 获取储备量信息
              const reserves = await pairContract.getReserves();
              const token0Address = await pairContract.token0();
              const totalSupply = await pairContract.totalSupply();

              // 获取用户LP代币余额
              const userAddress = await signer.getAddress();
              const userLPBalance = await pairContract.balanceOf(userAddress);

              // 确定token0和token1的顺序
              let token0, token1, reserve0, reserve1;
              if (
                token0Address.toLowerCase() === tokenA.address.toLowerCase()
              ) {
                token0 = tokenA;
                token1 = tokenB;
                reserve0 = ethers.formatUnits(reserves[0], tokenA.decimals);
                reserve1 = ethers.formatUnits(reserves[1], tokenB.decimals);
              } else {
                token0 = tokenB;
                token1 = tokenA;
                reserve0 = ethers.formatUnits(reserves[0], tokenB.decimals);
                reserve1 = ethers.formatUnits(reserves[1], tokenA.decimals);
              }

              // 计算用户份额
              const userShare =
                totalSupply > 0
                  ? ((userLPBalance * BigInt(10000)) / totalSupply).toString()
                  : "0";

              const poolInfo: PoolInfo = {
                token0,
                token1,
                pairAddress,
                reserve0,
                reserve1,
                totalSupply: ethers.formatUnits(totalSupply, 18),
                userLPBalance: ethers.formatUnits(userLPBalance, 18),
                userShare: (parseInt(userShare) / 100).toFixed(2),
              };

              foundPools.push(poolInfo);
            }
          } catch (error) {
            console.log(
              `❌ 检查 ${tokenA.symbol}-${tokenB.symbol} 交易对失败:`,
              error
            );
          }
        }
      }

      console.log(`🎯 共发现 ${foundPools.length} 个交易对`);
      setPools(foundPools);
    } catch (error) {
      console.error("获取交易对失败:", error);
      addNotification({
        type: "error",
        title: "获取失败",
        message: "获取交易对信息失败",
      });
    } finally {
      setLoading(false);
    }
  };

  // 刷新池信息
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllPools();
    setRefreshing(false);
    addNotification({
      type: "success",
      title: "刷新成功",
      message: "交易对信息已更新",
    });
  };

  // 初始加载和代币变化时重新获取
  useEffect(() => {
    if (isConnected && importedTokens.length >= 2) {
      fetchAllPools();
    } else {
      setPools([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, importedTokens, factoryContract, signer]);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
          <span className="text-3xl">🔗</span>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          连接钱包开始
        </h3>
        <p className="text-secondary text-sm">请先连接您的钱包以查看资金池</p>
      </div>
    );
  }

  if (importedTokens.length < 2) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
          <span className="text-3xl">📝</span>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          需要更多代币
        </h3>
        <p className="text-secondary text-sm mb-4">
          至少需要导入 2 个代币才能查看交易对
        </p>
        <div className="info-card inline-block">
          <p className="text-sm">💡 请先在"导入代币"页面添加需要的代币</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
          <span>🏊‍♂️</span> 资金池总览
        </h2>
        <p className="text-secondary text-sm">查看所有可用的流动性交易对信息</p>
      </div>

      {/* 刷新按钮 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted">
          {loading ? "检查中..." : `共发现 ${pools.length} 个交易对`}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="btn-secondary text-sm px-4 py-2"
        >
          {refreshing && <div className="loading-spinner mr-2"></div>}
          {refreshing ? "刷新中..." : "🔄 刷新"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-secondary">正在检查交易对...</p>
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-gray-500/20 to-slate-500/20 flex items-center justify-center">
            <span className="text-3xl">🏊‍♂️</span>
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">
            暂无交易对
          </h3>
          <p className="text-secondary text-sm mb-4">
            在已导入的代币中没有发现活跃的交易对
          </p>
          <div className="info-card inline-block">
            <p className="text-sm">💡 请先在"流动性"页面创建交易对</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pools.map((pool, index) => (
            <div
              key={`${pool.token0.address}-${pool.token1.address}`}
              className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all"
            >
              {/* 交易对标题 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-primary">
                      {pool.token0.symbol}
                    </span>
                    <span className="text-muted">-</span>
                    <span className="text-lg font-bold text-primary">
                      {pool.token1.symbol}
                    </span>
                  </div>
                  <div className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                    #{index + 1}
                  </div>
                </div>
                <div className="text-xs text-muted font-mono">
                  {pool.pairAddress.slice(0, 6)}...{pool.pairAddress.slice(-4)}
                </div>
              </div>

              {/* 储备量信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-secondary mb-1">
                    {pool.token0.symbol} 储备量
                  </div>
                  <div className="text-lg font-semibold text-primary font-mono">
                    {parseFloat(pool.reserve0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-secondary mb-1">
                    {pool.token1.symbol} 储备量
                  </div>
                  <div className="text-lg font-semibold text-primary font-mono">
                    {parseFloat(pool.reserve1).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 比例和流动性信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-secondary mb-1">交换比例</div>
                  <div className="text-sm font-medium text-primary">
                    1 {pool.token0.symbol} ={" "}
                    {parseFloat(pool.reserve0) > 0
                      ? (
                          parseFloat(pool.reserve1) / parseFloat(pool.reserve0)
                        ).toFixed(6)
                      : "0"}{" "}
                    {pool.token1.symbol}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-secondary mb-1">总流动性</div>
                  <div className="text-sm font-medium text-primary font-mono">
                    {parseFloat(pool.totalSupply).toFixed(6)} LP
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-secondary mb-1">总价值锁定</div>
                  <div className="text-sm font-medium text-primary">
                    {pool.token0.symbol}: {parseFloat(pool.reserve0).toFixed(2)}
                    <br />
                    {pool.token1.symbol}: {parseFloat(pool.reserve1).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* 用户持有信息 */}
              {parseFloat(pool.userLPBalance) > 0 ? (
                <div className="success-card">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-green-400 mb-1">
                        我的LP代币
                      </div>
                      <div className="text-sm font-semibold font-mono">
                        {parseFloat(pool.userLPBalance).toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-400 mb-1">
                        池中份额
                      </div>
                      <div className="text-sm font-semibold">
                        {pool.userShare}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-400 mb-1">
                        可提取价值
                      </div>
                      <div className="text-xs">
                        ~
                        {(
                          (parseFloat(pool.reserve0) *
                            parseFloat(pool.userShare)) /
                          100
                        ).toFixed(4)}{" "}
                        {pool.token0.symbol}
                        <br />~
                        {(
                          (parseFloat(pool.reserve1) *
                            parseFloat(pool.userShare)) /
                          100
                        ).toFixed(4)}{" "}
                        {pool.token1.symbol}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="info-card">
                  <div className="text-sm">💡 您在此池中没有流动性份额</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 统计信息 */}
      {pools.length > 0 && (
        <div className="info-card">
          <div className="flex items-start gap-3">
            <span className="text-lg">📊</span>
            <div className="text-sm">
              <p className="font-medium mb-1">统计信息：</p>
              <ul className="space-y-1 text-xs opacity-90">
                <li>• 总计 {pools.length} 个活跃交易对</li>
                <li>
                  • 我的持仓:{" "}
                  {pools.filter((p) => parseFloat(p.userLPBalance) > 0).length}{" "}
                  个池
                </li>
                <li>
                  • 总LP代币:{" "}
                  {pools
                    .reduce((sum, p) => sum + parseFloat(p.userLPBalance), 0)
                    .toFixed(6)}
                </li>
                <li>• 数据实时从区块链获取</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolsInterface;
