import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("🛣️ 测试多路径代币交换...\n");

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

  // 部署测试代币
  console.log("🪙 部署测试代币...");

  // 部署 TokenA
  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy();
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("TokenA (TKA) 地址:", tokenAAddress);

  // 部署 TokenB
  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy();
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("TokenB (TKB) 地址:", tokenBAddress);

  // 使用现有的USDT
  const usdt = await ethers.getContractAt("USDT", addresses.tokens.USDT);
  const usdtAddress = addresses.tokens.USDT;

  console.log("\n📊 当前代币:");
  console.log("- TokenA (TKA):", tokenAAddress);
  console.log("- TokenB (TKB):", tokenBAddress);
  console.log("- USDT:", usdtAddress);

  // 创建新的交易对: TKA-TKB, TKA-USDT, TKB-USDT
  console.log("\n🏗️ 创建交易对...");

  // 1. 创建 TKA-TKB 交易对
  const createPairTx1 = await factory.createPair(tokenAAddress, tokenBAddress);
  await createPairTx1.wait();
  const pairTKA_TKB = await factory.getPair(tokenAAddress, tokenBAddress);
  console.log("✅ TKA-TKB 对创建:", pairTKA_TKB);

  // 2. 创建 TKA-USDT 交易对
  const createPairTx2 = await factory.createPair(tokenAAddress, usdtAddress);
  await createPairTx2.wait();
  const pairTKA_USDT = await factory.getPair(tokenAAddress, usdtAddress);
  console.log("✅ TKA-USDT 对创建:", pairTKA_USDT);

  // 3. 创建 TKB-USDT 交易对
  const createPairTx3 = await factory.createPair(tokenBAddress, usdtAddress);
  await createPairTx3.wait();
  const pairTKB_USDT = await factory.getPair(tokenBAddress, usdtAddress);
  console.log("✅ TKB-USDT 对创建:", pairTKB_USDT);

  // 添加流动性到新交易对
  console.log("\n💧 添加流动性...");

  const deadline = Math.floor(Date.now() / 1000) + 1800;

  // 授权代币
  console.log("✅ 准备授权代币...");
  const tokenAContract = await ethers.getContractAt("TokenA", tokenAAddress);
  const tokenBContract = await ethers.getContractAt("TokenB", tokenBAddress);
  const usdtContract = await ethers.getContractAt("USDT", usdtAddress);

  await tokenAContract.approve(addresses.router, ethers.parseEther("5000"));
  await tokenBContract.approve(addresses.router, ethers.parseEther("5000"));
  await usdtContract.approve(addresses.router, ethers.parseEther("10000"));

  console.log("✅ 代币授权完成");

  // 1. 添加 TKA-TKB 流动性 (1:1 比例)
  console.log("💧 添加 TKA-TKB 流动性...");
  const addLiqTx1 = await router.addLiquidity(
    tokenAAddress,
    tokenBAddress,
    ethers.parseEther("1000"), // 1000 TKA
    ethers.parseEther("1000"), // 1000 TKB (1:1 比例)
    0,
    0,
    deployer.address,
    deadline
  );
  await addLiqTx1.wait();
  console.log("✅ TKA-TKB 流动性添加完成");

  // 2. 添加 TKA-USDT 流动性 (1:2 比例)
  console.log("💧 添加 TKA-USDT 流动性...");
  const addLiqTx2 = await router.addLiquidity(
    tokenAAddress,
    usdtAddress,
    ethers.parseEther("1000"), // 1000 TKA
    ethers.parseEther("2000"), // 2000 USDT (1 TKA = 2 USDT)
    0,
    0,
    deployer.address,
    deadline
  );
  await addLiqTx2.wait();
  console.log("✅ TKA-USDT 流动性添加完成");

  // 3. 添加 TKB-USDT 流动性 (1:1.5 比例)
  console.log("💧 添加 TKB-USDT 流动性...");
  const addLiqTx3 = await router.addLiquidity(
    tokenBAddress,
    usdtAddress,
    ethers.parseEther("1000"), // 1000 TKB
    ethers.parseEther("1500"), // 1500 USDT (1 TKB = 1.5 USDT)
    0,
    0,
    deployer.address,
    deadline
  );
  await addLiqTx3.wait();
  console.log("✅ TKB-USDT 流动性添加完成");

  // 现在我们有三个交易对：TKA-TKB, TKA-USDT, TKB-USDT
  // 这意味着可以通过 TKA -> USDT -> TKB 或直接 TKA -> TKB 进行交换

  console.log("\n🔄 测试多路径交换...");

  const swapAmount = ethers.parseEther("100"); // 100 TKA

  // 路径1: 直接交换 TKA -> TKB
  console.log("\n📍 路径1: TKA → TKB (直接)");
  try {
    const directPath = [tokenAAddress, tokenBAddress];
    const directAmounts = await router.getAmountsOut(swapAmount, directPath);
    const directOutput = ethers.formatEther(directAmounts[1]);
    console.log(`✅ 直接路径输出: ${directOutput} TKB`);
  } catch (error) {
    console.log("❌ 直接路径不可用");
  }

  // 路径2: 间接交换 TKA -> USDT -> TKB
  console.log("\n📍 路径2: TKA → USDT → TKB (间接)");
  try {
    const indirectPath = [tokenAAddress, usdtAddress, tokenBAddress];
    const indirectAmounts = await router.getAmountsOut(
      swapAmount,
      indirectPath
    );
    const indirectOutput = ethers.formatEther(indirectAmounts[2]);
    console.log(`✅ 间接路径输出: ${indirectOutput} TKB`);
    console.log(
      `📈 中间 USDT 数量: ${ethers.formatEther(indirectAmounts[1])} USDT`
    );
  } catch (error) {
    console.log("❌ 间接路径不可用:", error);
  }

  // 比较两条路径的输出
  console.log("\n📊 路径比较分析:");

  try {
    const directPath = [tokenAAddress, tokenBAddress];
    const indirectPath = [tokenAAddress, usdtAddress, tokenBAddress];

    const directAmounts = await router.getAmountsOut(swapAmount, directPath);
    const indirectAmounts = await router.getAmountsOut(
      swapAmount,
      indirectPath
    );

    const directOutput = parseFloat(ethers.formatEther(directAmounts[1]));
    const indirectOutput = parseFloat(ethers.formatEther(indirectAmounts[2]));

    console.log(`📈 直接路径 (TKA→TKB): ${directOutput.toFixed(6)} TKB`);
    console.log(`📈 间接路径 (TKA→USDT→TKB): ${indirectOutput.toFixed(6)} TKB`);

    if (directOutput > indirectOutput) {
      const advantage =
        ((directOutput - indirectOutput) / indirectOutput) * 100;
      console.log(`🎯 最优路径: 直接路径，优势 ${advantage.toFixed(2)}%`);
    } else {
      const advantage = ((indirectOutput - directOutput) / directOutput) * 100;
      console.log(`🎯 最优路径: 间接路径，优势 ${advantage.toFixed(2)}%`);
    }
  } catch (error) {
    console.log("❌ 路径比较失败:", error);
  }

  // 执行实际的多路径交换（选择最优路径）
  console.log("\n💱 执行多路径交换...");

  try {
    const directPath = [tokenAAddress, tokenBAddress];
    const indirectPath = [tokenAAddress, usdtAddress, tokenBAddress];

    const directAmounts = await router.getAmountsOut(swapAmount, directPath);
    const indirectAmounts = await router.getAmountsOut(
      swapAmount,
      indirectPath
    );

    const directOutput = parseFloat(ethers.formatEther(directAmounts[1]));
    const indirectOutput = parseFloat(ethers.formatEther(indirectAmounts[2]));

    let selectedPath, selectedAmounts, pathName;

    if (directOutput >= indirectOutput) {
      selectedPath = directPath;
      selectedAmounts = directAmounts;
      pathName = "直接路径 (TKA→TKB)";
    } else {
      selectedPath = indirectPath;
      selectedAmounts = indirectAmounts;
      pathName = "间接路径 (TKA→USDT→TKB)";
    }

    console.log(`🎯 选择最优路径: ${pathName}`);
    console.log(
      `📈 预期输出: ${ethers.formatEther(
        selectedAmounts[selectedAmounts.length - 1]
      )} TKB`
    );

    // 获取初始余额
    const initialTKA = await tokenAContract.balanceOf(deployer.address);
    const initialTKB = await tokenBContract.balanceOf(deployer.address);

    console.log("\n📊 交换前余额:");
    console.log(`- TKA: ${ethers.formatEther(initialTKA)}`);
    console.log(`- TKB: ${ethers.formatEther(initialTKB)}`);

    // 执行交换
    const minAmountOut =
      (selectedAmounts[selectedAmounts.length - 1] * BigInt(95)) / BigInt(100); // 5% 滑点

    const swapTx = await router.swapExactTokensForTokens(
      swapAmount,
      minAmountOut,
      selectedPath,
      deployer.address,
      deadline
    );

    await swapTx.wait();
    console.log("✅ 多路径交换成功!");

    // 获取最终余额
    const finalTKA = await tokenAContract.balanceOf(deployer.address);
    const finalTKB = await tokenBContract.balanceOf(deployer.address);

    console.log("\n📊 交换后余额:");
    console.log(`- TKA: ${ethers.formatEther(finalTKA)}`);
    console.log(`- TKB: ${ethers.formatEther(finalTKB)}`);

    console.log("\n💹 交换结果:");
    console.log(`- 消耗 TKA: ${ethers.formatEther(initialTKA - finalTKA)}`);
    console.log(`- 获得 TKB: ${ethers.formatEther(finalTKB - initialTKB)}`);
  } catch (error) {
    console.error("❌ 多路径交换失败:", error);
  }

  // 输出新代币地址以便前端使用
  console.log("\n📝 合约地址汇总:");
  console.log("=".repeat(50));
  console.log(`TokenA (TKA) 地址: ${tokenAAddress}`);
  console.log(`TokenB (TKB) 地址: ${tokenBAddress}`);
  console.log(`USDT 地址: ${usdtAddress}`);
  console.log(`TKA-TKB 交易对: ${pairTKA_TKB}`);
  console.log(`TKA-USDT 交易对: ${pairTKA_USDT}`);
  console.log(`TKB-USDT 交易对: ${pairTKB_USDT}`);

  console.log("\n🎉 多路径交换测试完成!");
  console.log("现在前端支持以下交换路径:");
  console.log("1. TKA ↔ TKB (直接)");
  console.log("2. TKA ↔ USDT (直接)");
  console.log("3. TKB ↔ USDT (直接)");
  console.log("4. TKA → USDT → TKB (间接)");
  console.log("5. TKB → USDT → TKA (间接)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
