import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("💱 测试代币交换...\n");

  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);

  // 获取合约实例
  const tokenA = await ethers.getContractAt("TokenA", addresses.tokenA);
  const tokenB = await ethers.getContractAt("TokenB", addresses.tokenB);
  const router = await ethers.getContractAt(
    "UniswapV2Router",
    addresses.router
  );

  // 交换数量
  const amountIn = ethers.parseEther("100"); // 用 100 TKA 换 TKB

  console.log("准备交换:");
  console.log("- 输入:", ethers.formatEther(amountIn), "TKA");

  // 获取初始余额
  const initialBalanceA = await tokenA.balanceOf(deployer.address);
  const initialBalanceB = await tokenB.balanceOf(deployer.address);

  console.log("\n初始余额:");
  console.log("- TokenA:", ethers.formatEther(initialBalanceA), "TKA");
  console.log("- TokenB:", ethers.formatEther(initialBalanceB), "TKB");

  // 获取预期输出
  const amountsOut = await router.getAmountsOut(amountIn, [
    addresses.tokenA,
    addresses.tokenB,
  ]);
  const expectedOut = amountsOut[1];

  console.log("\n预期输出:");
  console.log("- 预期得到:", ethers.formatEther(expectedOut), "TKB");

  // 执行交换
  console.log("\n💱 执行交换...");

  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30分钟后过期
  const minAmountOut = (expectedOut * BigInt(95)) / BigInt(100); // 5% 滑点容忍

  try {
    const swapTx = await router.swapExactTokensForTokens(
      amountIn,
      minAmountOut,
      [addresses.tokenA, addresses.tokenB],
      deployer.address,
      deadline
    );

    console.log("交易已提交，等待确认...");
    const receipt = await swapTx.wait();
    if (!receipt) {
      throw new Error("交易收据为空");
    }
    console.log("✅ 交换成功!");
    console.log("交易哈希:", receipt.hash);

    // 获取最终余额
    const finalBalanceA = await tokenA.balanceOf(deployer.address);
    const finalBalanceB = await tokenB.balanceOf(deployer.address);

    console.log("\n最终余额:");
    console.log("- TokenA:", ethers.formatEther(finalBalanceA), "TKA");
    console.log("- TokenB:", ethers.formatEther(finalBalanceB), "TKB");

    console.log("\n交换结果:");
    console.log(
      "- 花费:",
      ethers.formatEther(initialBalanceA - finalBalanceA),
      "TKA"
    );
    console.log(
      "- 得到:",
      ethers.formatEther(finalBalanceB - initialBalanceB),
      "TKB"
    );

    const actualRate =
      ((finalBalanceB - initialBalanceB) * BigInt(10000)) /
      (initialBalanceA - finalBalanceA);
    console.log("- 实际汇率: 1 TKA =", Number(actualRate) / 10000, "TKB");

    console.log("\n🎉 交换测试成功！前端现在应该可以正常交换了！");
  } catch (error: any) {
    console.error("❌ 交换失败:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ 测试失败:", error);
  process.exitCode = 1;
});
