import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("🐛 调试交换问题...\n");

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

  // 获取流动性池
  const pairAddress = await factory.getPair(addresses.tokenA, addresses.tokenB);
  const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);

  console.log("📋 基本信息:");
  console.log("- 流动性池地址:", pairAddress);
  console.log("- Token0:", await pair.token0());
  console.log("- Token1:", await pair.token1());

  // 检查储备量
  const reserves = await pair.getReserves();
  console.log("\n🏊 储备量:");
  console.log("- Reserve0:", ethers.formatEther(reserves[0]));
  console.log("- Reserve1:", ethers.formatEther(reserves[1]));

  // 检查余额和授权
  const balanceA = await tokenA.balanceOf(deployer.address);
  const balanceB = await tokenB.balanceOf(deployer.address);
  const allowanceA = await tokenA.allowance(deployer.address, addresses.router);
  const allowanceB = await tokenB.allowance(deployer.address, addresses.router);

  console.log("\n💰 账户状态:");
  console.log("- TokenA 余额:", ethers.formatEther(balanceA));
  console.log("- TokenB 余额:", ethers.formatEther(balanceB));
  console.log("- TokenA 授权:", ethers.formatEther(allowanceA));
  console.log("- TokenB 授权:", ethers.formatEther(allowanceB));

  // 尝试非常小的交换 - 1 TokenA
  const amountIn = ethers.parseEther("1");
  console.log("\n🧪 测试 1 TKA 交换:");

  try {
    // 获取预期输出
    const amountsOut = await router.getAmountsOut(amountIn, [
      addresses.tokenA,
      addresses.tokenB,
    ]);
    console.log("- 预期输出:", ethers.formatEther(amountsOut[1]), "TKB");

    // 计算最小输出（0.5% 滑点）
    const minAmountOut = (amountsOut[1] * BigInt(995)) / BigInt(1000);
    console.log("- 最小输出:", ethers.formatEther(minAmountOut), "TKB");

    const deadline = Math.floor(Date.now() / 1000) + 1800;

    // 尝试交换
    console.log("\n🔄 执行交换...");
    const swapTx = await router.swapExactTokensForTokens(
      amountIn,
      minAmountOut,
      [addresses.tokenA, addresses.tokenB],
      deployer.address,
      deadline,
      { gasLimit: 300000 } // 设置明确的 gas 限制
    );

    const receipt = await swapTx.wait();
    if (!receipt) {
      throw new Error("交易收据为空");
    }

    console.log("✅ 交换成功!");
    console.log("- Gas 使用:", receipt.gasUsed.toString());
    console.log("- 交易哈希:", receipt.hash);

    // 验证余额变化
    const newBalanceA = await tokenA.balanceOf(deployer.address);
    const newBalanceB = await tokenB.balanceOf(deployer.address);

    console.log("\n📊 交换结果:");
    console.log("- TokenA 变化:", ethers.formatEther(balanceA - newBalanceA));
    console.log("- TokenB 变化:", ethers.formatEther(newBalanceB - balanceB));
  } catch (error: any) {
    console.error("❌ 交换失败:");
    console.error("- 错误:", error.message);

    if (error.reason) {
      console.error("- 原因:", error.reason);
    }

    if (error.data) {
      console.error("- 数据:", error.data);
    }

    // 尝试估算 gas
    try {
      console.log("\n🔍 尝试估算 gas...");
      const deadline = Math.floor(Date.now() / 1000) + 1800;
      const minAmountOut = ethers.parseEther("0.99");

      const gasEstimate = await router.swapExactTokensForTokens.estimateGas(
        amountIn,
        minAmountOut,
        [addresses.tokenA, addresses.tokenB],
        deployer.address,
        deadline
      );
      console.log("- 估算 gas:", gasEstimate.toString());
    } catch (gasError: any) {
      console.error("- Gas 估算失败:", gasError.message);
    }
  }
}

main().catch((error) => {
  console.error("❌ 调试失败:", error);
  process.exitCode = 1;
});
