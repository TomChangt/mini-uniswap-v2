import { ethers } from "hardhat";
import addresses from "../frontend/src/contracts/addresses.json";

async function main() {
  console.log("🔍 检查代币余额...\n");

  const [deployer] = await ethers.getSigners();
  console.log("检查账户地址:", deployer.address);

  // 获取代币合约
  const tokenA = await ethers.getContractAt("TokenA", addresses.tokenA);
  const tokenB = await ethers.getContractAt("TokenB", addresses.tokenB);

  // 获取代币余额
  const balanceA = await tokenA.balanceOf(deployer.address);
  const balanceB = await tokenB.balanceOf(deployer.address);

  console.log("\n代币余额:");
  console.log("- TokenA (TKA):", ethers.formatEther(balanceA));
  console.log("- TokenB (TKB):", ethers.formatEther(balanceB));

  // 检查水龙头限制
  const limit = ethers.parseEther("10000"); // 10,000 代币限制

  console.log("\n水龙头状态:");
  console.log("- TokenA 限制:", ethers.formatEther(limit), "TKA");
  console.log(
    "- TokenA 可用:",
    balanceA < limit ? "✅ 可以领取" : "❌ 已达到限制"
  );

  console.log("- TokenB 限制:", ethers.formatEther(limit), "TKB");
  console.log(
    "- TokenB 可用:",
    balanceB < limit ? "✅ 可以领取" : "❌ 已达到限制"
  );

  // 计算还能获得多少代币
  if (balanceA < limit) {
    const remaining = limit - balanceA;
    console.log("- TokenA 剩余额度:", ethers.formatEther(remaining), "TKA");
  }

  if (balanceB < limit) {
    const remaining = limit - balanceB;
    console.log("- TokenB 剩余额度:", ethers.formatEther(remaining), "TKB");
  }
}

main().catch((error) => {
  console.error("❌ 检查失败:", error);
  process.exitCode = 1;
});
