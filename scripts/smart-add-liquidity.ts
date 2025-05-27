import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("🧠 智能添加流动性...\n");

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

  // 用户想要添加的 TokenA 数量
  const desiredAmountA = ethers.parseEther("1000"); // 1000 TKA

  // 根据当前比例计算需要的 TokenB 数量
  const requiredAmountB = (desiredAmountA * reserveB) / reserveA;

  console.log("\n💡 智能计算结果:");
  console.log("- 要添加的 TokenA:", ethers.formatEther(desiredAmountA), "TKA");
  console.log("- 需要的 TokenB:", ethers.formatEther(requiredAmountB), "TKB");

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

  if (balanceB < requiredAmountB) {
    console.log("❌ TokenB 余额不足！");
    console.log(
      `需要 ${ethers.formatEther(
        requiredAmountB
      )} TKB，但只有 ${ethers.formatEther(balanceB)} TKB`
    );
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

  if (allowanceB < requiredAmountB) {
    console.log("授权 TokenB...");
    const approveTxB = await tokenB.approve(
      addresses.router,
      ethers.parseEther("1000000")
    );
    await approveTxB.wait();
    console.log("✅ TokenB 授权完成");
  }

  // 添加流动性
  console.log("\n🏊 添加流动性...");

  const deadline = Math.floor(Date.now() / 1000) + 1800;
  const amountAMin = (desiredAmountA * BigInt(98)) / BigInt(100); // 2% 滑点
  const amountBMin = (requiredAmountB * BigInt(98)) / BigInt(100); // 2% 滑点

  try {
    const addLiquidityTx = await router.addLiquidity(
      addresses.tokenA,
      addresses.tokenB,
      desiredAmountA,
      requiredAmountB,
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

    // 检查新的LP代币余额
    const lpBalance = await pair.balanceOf(deployer.address);
    console.log("LP 代币余额:", ethers.formatEther(lpBalance));

    // 检查新的池储备量
    const newReserves = await pair.getReserves();
    if (token0.toLowerCase() === addresses.tokenA.toLowerCase()) {
      console.log("\n📊 更新后的池状态:");
      console.log("- TokenA 储备:", ethers.formatEther(newReserves[0]));
      console.log("- TokenB 储备:", ethers.formatEther(newReserves[1]));
    } else {
      console.log("\n📊 更新后的池状态:");
      console.log("- TokenB 储备:", ethers.formatEther(newReserves[0]));
      console.log("- TokenA 储备:", ethers.formatEther(newReserves[1]));
    }
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
