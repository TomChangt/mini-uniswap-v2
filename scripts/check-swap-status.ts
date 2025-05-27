import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("🔍 诊断交换问题...\n");

  const [deployer] = await ethers.getSigners();
  console.log("账户地址:", deployer.address);

  // 获取合约实例
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

  console.log("\n📋 合约地址:");
  console.log("- Factory:", addresses.factory);
  console.log("- Router:", addresses.router);
  console.log("- TokenA:", addresses.tokenA);
  console.log("- TokenB:", addresses.tokenB);

  // 检查代币余额
  const balanceA = await tokenA.balanceOf(deployer.address);
  const balanceB = await tokenB.balanceOf(deployer.address);
  console.log("\n💰 代币余额:");
  console.log("- TokenA:", ethers.formatEther(balanceA), "TKA");
  console.log("- TokenB:", ethers.formatEther(balanceB), "TKB");

  // 检查流动性池是否存在
  const pairAddress = await factory.getPair(addresses.tokenA, addresses.tokenB);
  console.log("\n🏊 流动性池状态:");
  console.log("- 池地址:", pairAddress);

  if (pairAddress === "0x0000000000000000000000000000000000000000") {
    console.log("❌ 流动性池不存在！需要先创建流动性池");
    console.log("\n建议操作:");
    console.log("1. 先添加流动性来创建池");
    console.log("2. 或者运行创建池的脚本");
    return;
  } else {
    console.log("✅ 流动性池已存在");

    // 检查池的储备量
    const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
    const reserves = await pair.getReserves();
    const token0 = await pair.token0();
    const token1 = await pair.token1();

    console.log("\n🏊 池储备量:");
    if (token0.toLowerCase() === addresses.tokenA.toLowerCase()) {
      console.log("- TokenA 储备:", ethers.formatEther(reserves[0]));
      console.log("- TokenB 储备:", ethers.formatEther(reserves[1]));
    } else {
      console.log("- TokenB 储备:", ethers.formatEther(reserves[0]));
      console.log("- TokenA 储备:", ethers.formatEther(reserves[1]));
    }
  }

  // 检查授权状态
  const allowanceA = await tokenA.allowance(deployer.address, addresses.router);
  const allowanceB = await tokenB.allowance(deployer.address, addresses.router);

  console.log("\n🔐 授权状态:");
  console.log("- TokenA 授权给 Router:", ethers.formatEther(allowanceA), "TKA");
  console.log("- TokenB 授权给 Router:", ethers.formatEther(allowanceB), "TKB");

  const needsApproval =
    allowanceA < ethers.parseEther("1000") ||
    allowanceB < ethers.parseEther("1000");
  if (needsApproval) {
    console.log("⚠️  需要先授权代币给路由合约");
  } else {
    console.log("✅ 授权充足");
  }

  // 尝试获取交换价格（如果池存在）
  if (pairAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const amountIn = ethers.parseEther("1"); // 1 TokenA
      const amountsOut = await router.getAmountsOut(amountIn, [
        addresses.tokenA,
        addresses.tokenB,
      ]);
      console.log("\n💱 价格信息:");
      console.log("- 1 TKA 可兑换:", ethers.formatEther(amountsOut[1]), "TKB");
    } catch (error: any) {
      console.log("\n❌ 无法获取价格:", error.message);
    }
  }
}

main().catch((error) => {
  console.error("❌ 诊断失败:", error);
  process.exitCode = 1;
});
