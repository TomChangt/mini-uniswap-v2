import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("🏊 添加流动性...\n");

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

  // 添加的流动性数量
  const amountA = ethers.parseEther("10000"); // 10,000 TKA
  const amountB = ethers.parseEther("10000"); // 10,000 TKB

  console.log("准备添加流动性:");
  console.log("- TokenA 数量:", ethers.formatEther(amountA), "TKA");
  console.log("- TokenB 数量:", ethers.formatEther(amountB), "TKB");

  // 检查余额
  const balanceA = await tokenA.balanceOf(deployer.address);
  const balanceB = await tokenB.balanceOf(deployer.address);
  console.log("\n当前余额:");
  console.log("- TokenA:", ethers.formatEther(balanceA), "TKA");
  console.log("- TokenB:", ethers.formatEther(balanceB), "TKB");

  if (balanceA < amountA || balanceB < amountB) {
    console.log("❌ 余额不足！");
    return;
  }

  // 步骤1: 授权代币给路由合约
  console.log("\n🔐 步骤1: 授权代币...");

  const allowanceA = await tokenA.allowance(deployer.address, addresses.router);
  const allowanceB = await tokenB.allowance(deployer.address, addresses.router);

  if (allowanceA < amountA) {
    console.log("授权 TokenA...");
    const approveTxA = await tokenA.approve(
      addresses.router,
      ethers.parseEther("1000000")
    );
    await approveTxA.wait();
    console.log("✅ TokenA 授权完成");
  } else {
    console.log("✅ TokenA 已有足够授权");
  }

  if (allowanceB < amountB) {
    console.log("授权 TokenB...");
    const approveTxB = await tokenB.approve(
      addresses.router,
      ethers.parseEther("1000000")
    );
    await approveTxB.wait();
    console.log("✅ TokenB 授权完成");
  } else {
    console.log("✅ TokenB 已有足够授权");
  }

  // 步骤2: 添加流动性
  console.log("\n🏊 步骤2: 添加流动性...");

  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30分钟后过期

  try {
    const addLiquidityTx = await router.addLiquidity(
      addresses.tokenA,
      addresses.tokenB,
      amountA,
      amountB,
      (amountA * BigInt(95)) / BigInt(100), // 最小数量A (5%滑点)
      (amountB * BigInt(95)) / BigInt(100), // 最小数量B (5%滑点)
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

    // 检查流动性池
    const pairAddress = await factory.getPair(
      addresses.tokenA,
      addresses.tokenB
    );
    console.log("流动性池地址:", pairAddress);

    // 检查流动性代币余额
    const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
    const lpBalance = await pair.balanceOf(deployer.address);
    console.log("LP 代币余额:", ethers.formatEther(lpBalance));

    // 检查池储备量
    const reserves = await pair.getReserves();
    const token0 = await pair.token0();

    if (token0.toLowerCase() === addresses.tokenA.toLowerCase()) {
      console.log("池储备量:");
      console.log("- TokenA:", ethers.formatEther(reserves[0]));
      console.log("- TokenB:", ethers.formatEther(reserves[1]));
    } else {
      console.log("池储备量:");
      console.log("- TokenB:", ethers.formatEther(reserves[0]));
      console.log("- TokenA:", ethers.formatEther(reserves[1]));
    }

    console.log("\n🎉 现在可以进行代币交换了！");
  } catch (error: any) {
    console.error("❌ 添加流动性失败:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ 执行失败:", error);
  process.exitCode = 1;
});
