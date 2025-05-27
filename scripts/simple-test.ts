import { ethers } from "hardhat";

async function main() {
  console.log("🔍 简化测试 Solidity 0.8.28 兼容性...\n");

  const [deployer, user1] = await ethers.getSigners();

  // 直接部署合约而不是从文件读取地址
  console.log("部署合约...");

  // 部署 Factory
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();

  // 部署 Router
  const Router = await ethers.getContractFactory("UniswapV2Router");
  const router = await Router.deploy(await factory.getAddress());
  await router.waitForDeployment();

  // 部署代币
  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy();
  await tokenA.waitForDeployment();

  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy();
  await tokenB.waitForDeployment();

  console.log("✅ 合约部署成功");

  // 获取代币
  await tokenA.connect(user1).faucet();
  await tokenB.connect(user1).faucet();
  console.log("✅ 代币获取成功");

  // 添加流动性
  const amountA = ethers.parseEther("100");
  const amountB = ethers.parseEther("100");

  await tokenA.connect(user1).approve(await router.getAddress(), amountA);
  await tokenB.connect(user1).approve(await router.getAddress(), amountB);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  try {
    await router
      .connect(user1)
      .addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountA,
        amountB,
        (amountA * BigInt(95)) / BigInt(100),
        (amountB * BigInt(95)) / BigInt(100),
        user1.address,
        deadline
      );
    console.log("✅ 流动性添加成功");
  } catch (error) {
    console.error("❌ 流动性添加失败:", error);
    return;
  }

  // 尝试小额交换
  const swapAmount = ethers.parseEther("1"); // 减少到 1 个代币

  await tokenA.connect(user1).approve(await router.getAddress(), swapAmount);

  try {
    const path = [await tokenA.getAddress(), await tokenB.getAddress()];
    const amounts = await router.getAmountsOut(swapAmount, path);
    console.log(`预期获得: ${ethers.formatEther(amounts[1])} TKB`);

    await router
      .connect(user1)
      .swapExactTokensForTokens(
        swapAmount,
        (amounts[1] * BigInt(95)) / BigInt(100),
        path,
        user1.address,
        deadline
      );
    console.log("✅ 代币交换成功");
  } catch (error: any) {
    console.error("❌ 代币交换失败:", error);
    console.error("错误详情:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ 测试失败:", error);
  process.exitCode = 1;
});
