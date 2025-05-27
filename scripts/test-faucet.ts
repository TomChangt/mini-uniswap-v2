import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("🚰 测试水龙头功能...\n");

  const [deployer] = await ethers.getSigners();
  console.log("测试账户地址:", deployer.address);

  // 获取代币合约
  const tokenA = await ethers.getContractAt("TokenA", addresses.tokenA);
  const tokenB = await ethers.getContractAt("TokenB", addresses.tokenB);

  // 获取初始余额
  const initialBalanceA = await tokenA.balanceOf(deployer.address);
  const initialBalanceB = await tokenB.balanceOf(deployer.address);

  console.log("\n初始余额:");
  console.log("- TokenA (TKA):", ethers.formatEther(initialBalanceA));
  console.log("- TokenB (TKB):", ethers.formatEther(initialBalanceB));

  // 测试 TokenA 水龙头
  console.log("\n🚰 测试 TokenA 水龙头...");
  try {
    const tx1 = await tokenA.faucet();
    await tx1.wait();
    console.log("✅ TokenA 水龙头成功!");

    const newBalanceA = await tokenA.balanceOf(deployer.address);
    console.log("新的 TokenA 余额:", ethers.formatEther(newBalanceA));
    console.log(
      "增加了:",
      ethers.formatEther(newBalanceA - initialBalanceA),
      "TKA"
    );
  } catch (error: any) {
    console.error("❌ TokenA 水龙头失败:", error.message);
  }

  // 测试 TokenB 水龙头
  console.log("\n🚰 测试 TokenB 水龙头...");
  try {
    const tx2 = await tokenB.faucet();
    await tx2.wait();
    console.log("✅ TokenB 水龙头成功!");

    const newBalanceB = await tokenB.balanceOf(deployer.address);
    console.log("新的 TokenB 余额:", ethers.formatEther(newBalanceB));
    console.log(
      "增加了:",
      ethers.formatEther(newBalanceB - initialBalanceB),
      "TKB"
    );
  } catch (error: any) {
    console.error("❌ TokenB 水龙头失败:", error.message);
  }

  console.log("\n🎉 水龙头测试完成!");
}

main().catch((error) => {
  console.error("❌ 测试失败:", error);
  process.exitCode = 1;
});
