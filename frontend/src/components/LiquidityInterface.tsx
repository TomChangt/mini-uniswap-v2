import React, { useState, useEffect, useCallback, useRef } from "react";
import { useWeb3 } from "../contexts/Web3Context";
import { useNotification } from "../contexts/NotificationContext";
import { ethers } from "ethers";
import addresses from "../contracts/addresses.json";

const LiquidityInterface: React.FC = () => {
  const {
    account,
    tokenAContract,
    tokenBContract,
    routerContract,
    factoryContract,
    isConnected,
    tokenABalance,
    tokenBBalance,
    refreshTokenBalances,
  } = useWeb3();
  const { showSuccess, showError, showInfo } = useNotification();
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");

  // 添加流动性状态
  const [amountA, setAmountA] = useState<string>("");
  const [amountB, setAmountB] = useState<string>("");
  const [lastEditedField, setLastEditedField] = useState<"A" | "B" | null>(
    null
  );
  const [reserves, setReserves] = useState<{
    reserveA: string;
    reserveB: string;
  }>({ reserveA: "0", reserveB: "0" });

  // 防抖定时器引用
  const debounceTimerA = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerB = useRef<NodeJS.Timeout | null>(null);

  // 移除流动性状态
  const [lpBalance, setLpBalance] = useState<string>("0");
  const [removePercentage, setRemovePercentage] = useState<number>(25);
  const [removeAmountA, setRemoveAmountA] = useState<string>("0");
  const [removeAmountB, setRemoveAmountB] = useState<string>("0");

  const [loading, setLoading] = useState(false);
  const [pairAddress, setPairAddress] = useState<string>("");

  // 创建可复用的数据刷新函数
  const refreshData = useCallback(async () => {
    if (!account || !tokenAContract || !tokenBContract || !factoryContract)
      return;

    try {
      // 代币余额已由 Web3Context 统一管理

      // 获取交易对地址
      const pair = await factoryContract.getPair(
        addresses.tokenA,
        addresses.tokenB
      );
      setPairAddress(pair);

      // 如果交易对存在，获取LP代币余额和储备量
      if (pair !== ethers.ZeroAddress) {
        const pairContract = new ethers.Contract(
          pair,
          [
            "function balanceOf(address) view returns (uint256)",
            "function getReserves() view returns (uint112, uint112, uint32)",
            "function token0() view returns (address)",
          ],
          tokenAContract.runner
        );
        const [lpBal, reservesData, token0] = await Promise.all([
          pairContract.balanceOf(account),
          pairContract.getReserves(),
          pairContract.token0(),
        ]);

        setLpBalance(ethers.formatEther(lpBal));

        // 确定 TokenA 和 TokenB 的储备量
        const isTokenAFirst =
          token0.toLowerCase() === addresses.tokenA.toLowerCase();
        setReserves({
          reserveA: ethers.formatEther(
            isTokenAFirst ? reservesData[0] : reservesData[1]
          ),
          reserveB: ethers.formatEther(
            isTokenAFirst ? reservesData[1] : reservesData[0]
          ),
        });
      } else {
        setReserves({ reserveA: "0", reserveB: "0" });
      }
    } catch (error) {
      console.error("获取数据失败:", error);
    }
  }, [account, tokenAContract, tokenBContract, factoryContract]);

  useEffect(() => {
    refreshData();
  }, [account, tokenAContract, tokenBContract, factoryContract, refreshData]);

  // 智能计算流动性比例 - 使用防抖和防循环逻辑
  useEffect(() => {
    if (
      amountA &&
      lastEditedField === "A" &&
      parseFloat(reserves.reserveA) > 0 &&
      parseFloat(reserves.reserveB) > 0
    ) {
      if (debounceTimerA.current) {
        clearTimeout(debounceTimerA.current);
      }

      debounceTimerA.current = setTimeout(() => {
        const requiredB =
          (parseFloat(amountA) * parseFloat(reserves.reserveB)) /
          parseFloat(reserves.reserveA);
        setAmountB(requiredB.toFixed(6));
        setLastEditedField(null); // 重置编辑状态
      }, 300); // 300ms 防抖
    }
  }, [amountA, reserves, lastEditedField]);

  useEffect(() => {
    if (
      amountB &&
      lastEditedField === "B" &&
      parseFloat(reserves.reserveA) > 0 &&
      parseFloat(reserves.reserveB) > 0
    ) {
      if (debounceTimerB.current) {
        clearTimeout(debounceTimerB.current);
      }

      debounceTimerB.current = setTimeout(() => {
        const requiredA =
          (parseFloat(amountB) * parseFloat(reserves.reserveA)) /
          parseFloat(reserves.reserveB);
        setAmountA(requiredA.toFixed(6));
        setLastEditedField(null); // 重置编辑状态
      }, 300); // 300ms 防抖
    }
  }, [amountB, reserves, lastEditedField]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerA.current) {
        clearTimeout(debounceTimerA.current);
      }
      if (debounceTimerB.current) {
        clearTimeout(debounceTimerB.current);
      }
    };
  }, []);

  // 计算移除流动性时能获得的代币数量
  useEffect(() => {
    const calculateRemoveAmounts = async () => {
      if (
        !pairAddress ||
        pairAddress === ethers.ZeroAddress ||
        !lpBalance ||
        parseFloat(lpBalance) === 0
      ) {
        setRemoveAmountA("0");
        setRemoveAmountB("0");
        return;
      }

      try {
        const pairContract = new ethers.Contract(
          pairAddress,
          [
            "function getReserves() view returns (uint112, uint112, uint32)",
            "function totalSupply() view returns (uint256)",
          ],
          tokenAContract?.runner
        );

        const [reserves, totalSupply] = await Promise.all([
          pairContract.getReserves(),
          pairContract.totalSupply(),
        ]);

        const lpToRemove = ethers.parseEther(
          ((parseFloat(lpBalance) * removePercentage) / 100).toString()
        );
        const amountA = (lpToRemove * reserves[0]) / totalSupply;
        const amountB = (lpToRemove * reserves[1]) / totalSupply;

        setRemoveAmountA(ethers.formatEther(amountA));
        setRemoveAmountB(ethers.formatEther(amountB));
      } catch (error) {
        console.error("计算移除数量失败:", error);
      }
    };

    calculateRemoveAmounts();
  }, [pairAddress, lpBalance, removePercentage, tokenAContract]);

  const handleAddLiquidity = async () => {
    if (
      !tokenAContract ||
      !tokenBContract ||
      !routerContract ||
      !account ||
      !amountA ||
      !amountB
    )
      return;

    setLoading(true);
    try {
      const amountADesired = ethers.parseEther(amountA);
      const amountBDesired = ethers.parseEther(amountB);
      const amountAMin = (amountADesired * BigInt(95)) / BigInt(100); // 5% 滑点
      const amountBMin = (amountBDesired * BigInt(95)) / BigInt(100);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟

      // 检查并授权 TokenA
      const allowanceA = await tokenAContract.allowance(
        account,
        addresses.router
      );
      if (allowanceA < amountADesired) {
        showInfo("正在授权 TokenA 📝", "请确认 TokenA 授权交易...");
        const approveTxA = await tokenAContract.approve(
          addresses.router,
          ethers.MaxUint256
        );
        await approveTxA.wait();
        showSuccess("TokenA 授权成功 ✅", "TokenA 授权已完成");
      }

      // 检查并授权 TokenB
      const allowanceB = await tokenBContract.allowance(
        account,
        addresses.router
      );
      if (allowanceB < amountBDesired) {
        showInfo("正在授权 TokenB 📝", "请确认 TokenB 授权交易...");
        const approveTxB = await tokenBContract.approve(
          addresses.router,
          ethers.MaxUint256
        );
        await approveTxB.wait();
        showSuccess("TokenB 授权成功 ✅", "TokenB 授权已完成");
      }

      // 添加流动性
      const addLiquidityTx = await routerContract.addLiquidity(
        addresses.tokenA,
        addresses.tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        account,
        deadline
      );

      const receipt = await addLiquidityTx.wait();
      console.log("添加流动性成功! 交易哈希:", receipt?.hash);

      // 重置表单
      setAmountA("");
      setAmountB("");

      // 延迟刷新数据
      setTimeout(async () => {
        await refreshData();
        await refreshTokenBalances();
      }, 1000);

      showSuccess(
        "添加流动性成功! 🎉",
        `成功添加 ${amountA} TokenA 和 ${amountB} TokenB 到流动性池`
      );
    } catch (error: any) {
      console.error("添加流动性失败:", error);
      showError(
        "添加流动性失败 😞",
        `操作失败: ${error.message || "未知错误，请重试"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (
      !routerContract ||
      !account ||
      !lpBalance ||
      parseFloat(lpBalance) === 0
    )
      return;

    setLoading(true);
    try {
      const liquidity = ethers.parseEther(
        ((parseFloat(lpBalance) * removePercentage) / 100).toString()
      );
      const amountAMin =
        (ethers.parseEther(removeAmountA) * BigInt(95)) / BigInt(100); // 5% 滑点
      const amountBMin =
        (ethers.parseEther(removeAmountB) * BigInt(95)) / BigInt(100);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟

      // 授权LP代币
      const pairContract = new ethers.Contract(
        pairAddress,
        ["function approve(address, uint256) returns (bool)"],
        tokenAContract?.runner
      );

      const approveTx = await pairContract.approve(addresses.router, liquidity);
      await approveTx.wait();

      // 移除流动性
      const removeLiquidityTx = await routerContract.removeLiquidity(
        addresses.tokenA,
        addresses.tokenB,
        liquidity,
        amountAMin,
        amountBMin,
        account,
        deadline
      );

      const receipt = await removeLiquidityTx.wait();
      console.log("移除流动性成功! 交易哈希:", receipt?.hash);

      // 延迟刷新数据
      setTimeout(async () => {
        await refreshData();
        await refreshTokenBalances();
      }, 1000);

      showSuccess(
        "移除流动性成功! 🎉",
        `成功移除 ${removePercentage}% 的流动性，获得 ${parseFloat(
          removeAmountA
        ).toFixed(4)} TokenA 和 ${parseFloat(removeAmountB).toFixed(4)} TokenB`
      );
    } catch (error: any) {
      console.error("移除流动性失败:", error);
      showError(
        "移除流动性失败 😞",
        `操作失败: ${error.message || "未知错误，请重试"}`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="glass-card p-6 card-animation">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center mr-3">
            <span className="text-white font-bold">💧</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">流动性管理</h2>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔐</div>
          <p className="text-slate-300 text-lg">请先连接钱包以管理流动性</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 card-animation">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center mr-3">
          <span className="text-white font-bold">💧</span>
        </div>
        <h2 className="text-xl font-bold text-slate-100">流动性管理</h2>
      </div>

      {/* 标签切换 */}
      <div className="glass-card p-1 mb-6">
        <div className="flex relative">
          <button
            onClick={() => setActiveTab("add")}
            className={`flex-1 px-6 py-4 font-medium text-sm rounded-xl transition-all duration-300 ${
              activeTab === "add"
                ? "bg-white/15 text-slate-100 shadow-lg"
                : "text-slate-300 hover:text-slate-100 hover:bg-white/10"
            }`}
          >
            <span className="mr-2">➕</span>
            添加流动性
          </button>
          <button
            onClick={() => setActiveTab("remove")}
            className={`flex-1 px-6 py-4 font-medium text-sm rounded-xl transition-all duration-300 ${
              activeTab === "remove"
                ? "bg-white/15 text-slate-100 shadow-lg"
                : "text-slate-300 hover:text-slate-100 hover:bg-white/10"
            }`}
          >
            <span className="mr-2">➖</span>
            移除流动性
          </button>
        </div>
      </div>

      {activeTab === "add" && (
        <div>
          {/* 显示当前池比例 */}
          {parseFloat(reserves.reserveA) > 0 &&
            parseFloat(reserves.reserveB) > 0 && (
              <div className="mb-6 glass-card p-4">
                <div className="flex items-center mb-3">
                  <span className="text-lg mr-2">📊</span>
                  <div className="font-medium text-slate-100">当前池比例</div>
                </div>
                <div className="space-y-2">
                  <div className="text-blue-300 flex items-center">
                    <span className="mr-2">💱</span>1 TKA ={" "}
                    {(
                      parseFloat(reserves.reserveB) /
                      parseFloat(reserves.reserveA)
                    ).toFixed(6)}{" "}
                    TKB
                  </div>
                  <div className="text-green-300 flex items-center">
                    <span className="mr-2">🏦</span>
                    池中储备: {parseFloat(reserves.reserveA).toFixed(2)} TKA /{" "}
                    {parseFloat(reserves.reserveB).toFixed(2)} TKB
                  </div>
                </div>
              </div>
            )}

          {/* TokenA 输入 */}
          <div className="mb-4 glass-card p-4">
            <label className="block text-sm font-medium text-slate-100 mb-3 flex items-center">
              <span className="mr-2">🔷</span>
              TokenA 数量
            </label>
            <input
              type="number"
              value={amountA}
              onChange={(e) => {
                setAmountA(e.target.value);
                setLastEditedField("A");
              }}
              placeholder="0.0"
              className="custom-input w-full"
            />
            <div className="text-sm text-slate-300 mt-2 flex items-center">
              <span className="mr-1">💰</span>
              余额: {parseFloat(tokenABalance).toFixed(4)} TKA
            </div>
          </div>

          {/* TokenB 输入 */}
          <div className="mb-6 glass-card p-4">
            <label className="block text-sm font-medium text-slate-100 mb-3 flex items-center">
              <span className="mr-2">🔶</span>
              TokenB 数量
            </label>
            <input
              type="number"
              value={amountB}
              onChange={(e) => {
                setAmountB(e.target.value);
                setLastEditedField("B");
              }}
              placeholder="0.0"
              className="custom-input w-full"
            />
            <div className="text-sm text-slate-300 mt-2 flex items-center">
              <span className="mr-1">💰</span>
              余额: {parseFloat(tokenBBalance).toFixed(4)} TKB
            </div>
          </div>

          <button
            onClick={handleAddLiquidity}
            disabled={
              loading ||
              !amountA ||
              !amountB ||
              parseFloat(amountA) <= 0 ||
              parseFloat(amountB) <= 0
            }
            className={`w-full gradient-button success-button transition-all duration-300 py-4 ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="loading-spinner"></div>
                添加中...
              </div>
            ) : (
              <div className="flex items-center justify-center text-lg font-semibold">
                <span className="mr-2">💧</span>
                添加流动性
              </div>
            )}
          </button>
        </div>
      )}

      {activeTab === "remove" && (
        <div>
          <div className="mb-6 glass-card p-4">
            <div className="text-sm text-slate-300 mb-4 flex items-center">
              <span className="mr-2">🪙</span>
              LP 代币余额:{" "}
              <span className="text-slate-100 font-semibold ml-1">
                {parseFloat(lpBalance).toFixed(6)}
              </span>
            </div>

            {parseFloat(lpBalance) > 0 ? (
              <>
                {/* 移除百分比选择 */}
                <div className="mb-6 glass-card p-4">
                  <label className="block text-sm font-medium text-slate-100 mb-3 flex items-center">
                    <span className="mr-2">📊</span>
                    移除比例: {removePercentage}%
                  </label>
                  <div className="flex space-x-2 mb-4">
                    {[25, 50, 75, 100].map((percentage) => (
                      <button
                        key={percentage}
                        onClick={() => setRemovePercentage(percentage)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          removePercentage === percentage
                            ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
                            : "bg-white/15 text-slate-300 hover:bg-white/25 hover:text-slate-100"
                        }`}
                      >
                        {percentage}%
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={removePercentage}
                    onChange={(e) =>
                      setRemovePercentage(parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #f56565 0%, #f56565 ${removePercentage}%, rgba(255,255,255,0.2) ${removePercentage}%, rgba(255,255,255,0.2) 100%)`,
                    }}
                  />
                </div>

                {/* 预计获得 */}
                <div className="mb-6 glass-card p-4">
                  <div className="text-sm font-medium text-slate-100 mb-3 flex items-center">
                    <span className="mr-2">🎁</span>
                    预计获得:
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 flex items-center">
                        <span className="mr-2">🔷</span>
                        TokenA:
                      </span>
                      <span className="text-blue-300 font-semibold">
                        {parseFloat(removeAmountA).toFixed(6)} TKA
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 flex items-center">
                        <span className="mr-2">🔶</span>
                        TokenB:
                      </span>
                      <span className="text-orange-300 font-semibold">
                        {parseFloat(removeAmountB).toFixed(6)} TKB
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRemoveLiquidity}
                  disabled={loading}
                  className={`w-full gradient-button warning-button transition-all duration-300 py-4 ${
                    loading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-xl"
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="loading-spinner"></div>
                      移除中...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-lg font-semibold">
                      <span className="mr-2">🔥</span>
                      移除流动性
                    </div>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💧</div>
                <p className="text-slate-300 text-lg">您还没有 LP 代币</p>
                <p className="text-slate-400 text-sm mt-2">
                  先添加流动性来获得 LP 代币
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityInterface;
