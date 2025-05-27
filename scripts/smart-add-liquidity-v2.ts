import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("🧠 智能添加流动性 V2...\n");

  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);

  // 获取合约实例
  const tokenA = await ethers.getContractAt("TokenA", addresses.tokenA);
  const tokenB = await ethers.getContractAt("TokenB", addresses.tokenB);
  const router = await ethers.getContractAt(
    "UniswapV2Router",
    addresses.router
  );
  const factory = await ethers.getContractAt(
    "UniswapV2Factory",
    addresses.factory
  );

  // 检查流动性池
  const pairAddress = await factory.getPair(addresses.tokenA, addresses.tokenB);
  if (pairAddress === "0x0000000000000000000000000000000000000000") {
    console.log("❌ 流动性池不存在！请先创建池");
    return;
  }

  const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
  const reserves = await pair.getReserves();
  const token0 = await pair.token0();

  // 确定 TokenA 和 TokenB 在池中的位置
  let reserveA, reserveB;
  if (token0.toLowerCase() === addresses.tokenA.toLowerCase()) {
    reserveA = reserves[0];
    reserveB = reserves[1];
  } else {
    reserveA = reserves[1];
    reserveB = reserves[0];
  }

  console.log("📊 当前池状态:");
  console.log("- TokenA 储备:", ethers.formatEther(reserveA));
  console.log("- TokenB 储备:", ethers.formatEther(reserveB));
  console.log(
    "- 当前比例: 1 TKA =",
    ethers.formatEther((reserveB * ethers.parseEther("1")) / reserveA),
    "TKB"
  );

  // 使用更保守的数量
  const desiredAmountA = ethers.parseEther("500"); // 500 TKA

  // 根据路由合约的逻辑计算正确的数量
  const optimalAmountB = (desiredAmountA * reserveB) / reserveA;

  // 给 TokenB 数量一些额外的缓冲
  const amountBDesired = optimalAmountB + ethers.parseEther("10"); // 额外 10 TKB 缓冲

  console.log("\n💡 智能计算结果:");
  console.log("- 期望 TokenA:", ethers.formatEther(desiredAmountA), "TKA");
  console.log("- 期望 TokenB:", ethers.formatEther(amountBDesired), "TKB");
  console.log("- 最优 TokenB:", ethers.formatEther(optimalAmountB), "TKB");

  // 检查用户余额
  const balanceA = await tokenA.balanceOf(deployer.address);
  const balanceB = await tokenB.balanceOf(deployer.address);

  console.log("\n💰 用户余额:");
  console.log("- TokenA:", ethers.formatEther(balanceA), "TKA");
  console.log("- TokenB:", ethers.formatEther(balanceB), "TKB");

  if (balanceA < desiredAmountA) {
    console.log("❌ TokenA 余额不足！");
    return;
  }

  if (balanceB < amountBDesired) {
    console.log("❌ TokenB 余额不足！");
    return;
  }

  // 检查授权
  const allowanceA = await tokenA.allowance(deployer.address, addresses.router);
  const allowanceB = await tokenB.allowance(deployer.address, addresses.router);

  console.log("\n🔐 检查授权...");
  if (allowanceA < desiredAmountA) {
    console.log("授权 TokenA...");
    const approveTxA = await tokenA.approve(
      addresses.router,
      ethers.parseEther("1000000")
    );
    await approveTxA.wait();
    console.log("✅ TokenA 授权完成");
  }

  if (allowanceB < amountBDesired) {
    console.log("授权 TokenB...");
    const approveTxB = await tokenB.approve(
      addresses.router,
      ethers.parseEther("1000000")
    );
    await approveTxB.wait();
    console.log("✅ TokenB 授权完成");
  }

  // 设置更宽松的最小值（10% 滑点）
  const amountAMin = (desiredAmountA * BigInt(90)) / BigInt(100);
  const amountBMin = (optimalAmountB * BigInt(90)) / BigInt(100);

  console.log("\n📏 滑点设置:");
  console.log("- TokenA 最小:", ethers.formatEther(amountAMin), "TKA");
  console.log("- TokenB 最小:", ethers.formatEther(amountBMin), "TKB");

  // 添加流动性
  console.log("\n🏊 添加流动性...");

  const deadline = Math.floor(Date.now() / 1000) + 1800;

  try {
    const addLiquidityTx = await router.addLiquidity(
      addresses.tokenA,
      addresses.tokenB,
      desiredAmountA,
      amountBDesired,
      amountAMin,
      amountBMin,
      deployer.address,
      deadline
    );

    console.log("交易已提交，等待确认...");
    const receipt = await addLiquidityTx.wait();
    if (!receipt) {
      throw new Error("交易收据为空");
    }

    console.log("✅ 流动性添加成功!");
    console.log("交易哈希:", receipt.hash);

    // 检查结果
    const newBalanceA = await tokenA.balanceOf(deployer.address);
    const newBalanceB = await tokenB.balanceOf(deployer.address);
    const lpBalance = await pair.balanceOf(deployer.address);

    console.log("\n📊 交易结果:");
    console.log(
      "- 实际消耗 TokenA:",
      ethers.formatEther(balanceA - newBalanceA),
      "TKA"
    );
    console.log(
      "- 实际消耗 TokenB:",
      ethers.formatEther(balanceB - newBalanceB),
      "TKB"
    );
    console.log("- 获得 LP 代币:", ethers.formatEther(lpBalance));
  } catch (error: any) {
    console.error("❌ 添加流动性失败:", error.message);
    if (error.reason) {
      console.error("原因:", error.reason);
    }
  }
}

main().catch((error) => {
  console.error("❌ 执行失败:", error);
  process.exitCode = 1;
});
