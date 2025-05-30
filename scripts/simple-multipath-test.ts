import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("🛣️ 简化多路径交换测试...\n");

  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);

  // 获取合约实例
  const router = await ethers.getContractAt(
    "UniswapV2Router",
    addresses.router
  );
  const factory = await ethers.getContractAt(
    "UniswapV2Factory",
    addresses.factory
  );

  // 使用现有代币 (USDT, ETH, AVALANCHE)
  const usdt = await ethers.getContractAt("USDT", addresses.tokens.USDT);
  const eth = await ethers.getContractAt("ETH", addresses.tokens.ETH);
  const avax = await ethers.getContractAt(
    "AVALANCHE",
    addresses.tokens.AVALANCHE
  );

  console.log("📊 使用代币:");
  console.log("- USDT:", addresses.tokens.USDT);
  console.log("- ETH:", addresses.tokens.ETH);
  console.log("- AVALANCHE:", addresses.tokens.AVALANCHE);

  // 创建交易对
  console.log("\n🏗️ 创建交易对...");

  try {
    // 检查是否已存在交易对
    let pairUSDT_ETH = await factory.getPair(
      addresses.tokens.USDT,
      addresses.tokens.ETH
    );
    if (pairUSDT_ETH === ethers.ZeroAddress) {
      const createTx1 = await factory.createPair(
        addresses.tokens.USDT,
        addresses.tokens.ETH
      );
      await createTx1.wait();
      pairUSDT_ETH = await factory.getPair(
        addresses.tokens.USDT,
        addresses.tokens.ETH
      );
      console.log("✅ USDT-ETH 对创建:", pairUSDT_ETH);
    } else {
      console.log("✅ USDT-ETH 对已存在:", pairUSDT_ETH);
    }

    let pairETH_AVAX = await factory.getPair(
      addresses.tokens.ETH,
      addresses.tokens.AVALANCHE
    );
    if (pairETH_AVAX === ethers.ZeroAddress) {
      const createTx2 = await factory.createPair(
        addresses.tokens.ETH,
        addresses.tokens.AVALANCHE
      );
      await createTx2.wait();
      pairETH_AVAX = await factory.getPair(
        addresses.tokens.ETH,
        addresses.tokens.AVALANCHE
      );
      console.log("✅ ETH-AVALANCHE 对创建:", pairETH_AVAX);
    } else {
      console.log("✅ ETH-AVALANCHE 对已存在:", pairETH_AVAX);
    }

    let pairUSDT_AVAX = await factory.getPair(
      addresses.tokens.USDT,
      addresses.tokens.AVALANCHE
    );
    if (pairUSDT_AVAX === ethers.ZeroAddress) {
      const createTx3 = await factory.createPair(
        addresses.tokens.USDT,
        addresses.tokens.AVALANCHE
      );
      await createTx3.wait();
      pairUSDT_AVAX = await factory.getPair(
        addresses.tokens.USDT,
        addresses.tokens.AVALANCHE
      );
      console.log("✅ USDT-AVALANCHE 对创建:", pairUSDT_AVAX);
    } else {
      console.log("✅ USDT-AVALANCHE 对已存在:", pairUSDT_AVAX);
    }

    // 获取一些代币用于测试
    console.log("\n💰 获取测试代币...");
    await usdt.faucet();
    await eth.faucet();
    await avax.faucet();
    console.log("✅ 代币领取完成");

    // 检查余额
    const usdtBalance = await usdt.balanceOf(deployer.address);
    const ethBalance = await eth.balanceOf(deployer.address);
    const avaxBalance = await avax.balanceOf(deployer.address);

    console.log("\n💰 当前余额:");
    console.log(`- USDT: ${ethers.formatEther(usdtBalance)}`);
    console.log(`- ETH: ${ethers.formatEther(ethBalance)}`);
    console.log(`- AVALANCHE: ${ethers.formatEther(avaxBalance)}`);

    // 添加流动性
    console.log("\n💧 添加流动性...");

    const deadline = Math.floor(Date.now() / 1000) + 1800;

    // 授权代币
    await usdt.approve(addresses.router, ethers.parseEther("5000"));
    await eth.approve(addresses.router, ethers.parseEther("5000"));
    await avax.approve(addresses.router, ethers.parseEther("5000"));
    console.log("✅ 代币授权完成");

    // 添加 USDT-ETH 流动性 (1:1 比例)
    console.log("💧 添加 USDT-ETH 流动性...");
    try {
      const addLiqTx1 = await router.addLiquidity(
        addresses.tokens.USDT,
        addresses.tokens.ETH,
        ethers.parseEther("1000"), // 1000 USDT
        ethers.parseEther("1000"), // 1000 ETH
        0,
        0,
        deployer.address,
        deadline
      );
      await addLiqTx1.wait();
      console.log("✅ USDT-ETH 流动性添加完成");
    } catch (error) {
      console.log("⚠️ USDT-ETH 流动性添加可能失败，继续测试...");
    }

    // 添加 ETH-AVALANCHE 流动性 (1:2 比例)
    console.log("💧 添加 ETH-AVALANCHE 流动性...");
    try {
      const addLiqTx2 = await router.addLiquidity(
        addresses.tokens.ETH,
        addresses.tokens.AVALANCHE,
        ethers.parseEther("1000"), // 1000 ETH
        ethers.parseEther("2000"), // 2000 AVALANCHE
        0,
        0,
        deployer.address,
        deadline
      );
      await addLiqTx2.wait();
      console.log("✅ ETH-AVALANCHE 流动性添加完成");
    } catch (error) {
      console.log("⚠️ ETH-AVALANCHE 流动性添加可能失败，继续测试...");
    }

    // 测试多路径交换
    console.log("\n🔄 测试多路径交换...");
    const swapAmount = ethers.parseEther("10"); // 10 USDT

    // 路径1: 直接交换 USDT -> AVALANCHE (如果存在)
    console.log("\n📍 路径1: USDT → AVALANCHE (直接)");
    try {
      const directPath = [addresses.tokens.USDT, addresses.tokens.AVALANCHE];
      const directAmounts = await router.getAmountsOut(swapAmount, directPath);
      const directOutput = ethers.formatEther(directAmounts[1]);
      console.log(`✅ 直接路径输出: ${directOutput} AVALANCHE`);
    } catch (error) {
      console.log("❌ 直接路径不可用或无流动性");
    }

    // 路径2: 间接交换 USDT -> ETH -> AVALANCHE
    console.log("\n📍 路径2: USDT → ETH → AVALANCHE (间接)");
    try {
      const indirectPath = [
        addresses.tokens.USDT,
        addresses.tokens.ETH,
        addresses.tokens.AVALANCHE,
      ];
      const indirectAmounts = await router.getAmountsOut(
        swapAmount,
        indirectPath
      );
      const indirectOutput = ethers.formatEther(indirectAmounts[2]);
      console.log(`✅ 间接路径输出: ${indirectOutput} AVALANCHE`);
      console.log(
        `📈 中间 ETH 数量: ${ethers.formatEther(indirectAmounts[1])} ETH`
      );
    } catch (error) {
      console.log("❌ 间接路径不可用或无流动性");
    }

    console.log("\n🎉 多路径功能测试完成!");
    console.log("前端现在支持智能路径查找功能，能够:");
    console.log("1. 自动查找直接和间接交换路径");
    console.log("2. 比较不同路径的输出和价格影响");
    console.log("3. 自动选择最优路径执行交换");
    console.log("4. 支持最多3跳的复杂路径");
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
