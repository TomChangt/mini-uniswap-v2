import { ethers } from "hardhat";

async function main() {
  console.log("🚀 开始测试 Mini Uniswap V2 DEX...\n");

  const [deployer, user1] = await ethers.getSigners();

  // 获取已部署的合约
  const addresses = require("../frontend/src/contracts/addresses.json");

  const factory = await ethers.getContractAt(
    "UniswapV2Factory",
    addresses.factory
  );
  const router = await ethers.getContractAt(
    "UniswapV2Router",
    addresses.router
  );
  const tokenA = await ethers.getContractAt("TokenA", addresses.tokenA);
  const tokenB = await ethers.getContractAt("TokenB", addresses.tokenB);

  console.log("📋 合约地址:");
  console.log("Factory:", addresses.factory);
  console.log("Router:", addresses.router);
  console.log("TokenA:", addresses.tokenA);
  console.log("TokenB:", addresses.tokenB);
  console.log();

  // 1. 测试代币水龙头功能
  console.log("💧 测试代币水龙头功能...");
  await tokenA.connect(user1).faucet();
  await tokenB.connect(user1).faucet();

  const balanceA = await tokenA.balanceOf(user1.address);
  const balanceB = await tokenB.balanceOf(user1.address);

  console.log(`User1 TokenA 余额: ${ethers.formatEther(balanceA)} TKA`);
  console.log(`User1 TokenB 余额: ${ethers.formatEther(balanceB)} TKB`);
  console.log();

  // 2. 测试添加流动性
  console.log("🏊 测试添加流动性...");
  const amountA = ethers.parseEther("100");
  const amountB = ethers.parseEther("100");

  // 授权代币
  await tokenA.connect(user1).approve(addresses.router, amountA);
  await tokenB.connect(user1).approve(addresses.router, amountB);

  // 添加流动性
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const tx = await router.connect(user1).addLiquidity(
    addresses.tokenA,
    addresses.tokenB,
    amountA,
    amountB,
    (amountA * BigInt(95)) / BigInt(100), // 5% 滑点
    (amountB * BigInt(95)) / BigInt(100),
    user1.address,
    deadline
  );

  await tx.wait();
  console.log("✅ 流动性添加成功!");

  // 获取交易对地址
  const pairAddress = await factory.getPair(addresses.tokenA, addresses.tokenB);
  console.log("交易对地址:", pairAddress);

  const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
  const lpBalance = await pair.balanceOf(user1.address);
  console.log(`LP 代币余额: ${ethers.formatEther(lpBalance)}`);
  console.log();

  // 3. 测试代币交换
  console.log("🔄 测试代币交换...");
  const swapAmount = ethers.parseEther("10");

  // 授权交换代币
  await tokenA.connect(user1).approve(addresses.router, swapAmount);

  // 获取预期输出
  const path = [addresses.tokenA, addresses.tokenB];
  const amounts = await router.getAmountsOut(swapAmount, path);
  console.log(`交换 ${ethers.formatEther(swapAmount)} TKA`);
  console.log(`预期获得 ${ethers.formatEther(amounts[1])} TKB`);

  // 执行交换
  const swapTx = await router.connect(user1).swapExactTokensForTokens(
    swapAmount,
    (amounts[1] * BigInt(95)) / BigInt(100), // 5% 滑点
    path,
    user1.address,
    deadline
  );

  await swapTx.wait();
  console.log("✅ 代币交换成功!");

  // 检查余额变化
  const newBalanceA = await tokenA.balanceOf(user1.address);
  const newBalanceB = await tokenB.balanceOf(user1.address);

  console.log(`交换后 TokenA 余额: ${ethers.formatEther(newBalanceA)} TKA`);
  console.log(`交换后 TokenB 余额: ${ethers.formatEther(newBalanceB)} TKB`);
  console.log();

  // 4. 测试移除流动性
  console.log("🏊‍♂️ 测试移除流动性...");
  const lpToRemove = lpBalance / BigInt(4); // 移除 25%

  // 授权 LP 代币
  await pair.connect(user1).approve(addresses.router, lpToRemove);

  // 移除流动性
  const removeTx = await router.connect(user1).removeLiquidity(
    addresses.tokenA,
    addresses.tokenB,
    lpToRemove,
    0, // 最小 TokenA
    0, // 最小 TokenB
    user1.address,
    deadline
  );

  await removeTx.wait();
  console.log("✅ 流动性移除成功!");

  const finalLpBalance = await pair.balanceOf(user1.address);
  console.log(`剩余 LP 代币: ${ethers.formatEther(finalLpBalance)}`);

  console.log("\n🎉 所有测试完成! Mini Uniswap V2 DEX 运行正常!");
}

main().catch((error) => {
  console.error("❌ 测试失败:", error);
  process.exitCode = 1;
});
