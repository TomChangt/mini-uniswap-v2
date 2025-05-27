import { ethers } from "hardhat";

async function main() {
  console.log("🔍 检查账户余额...\n");

  const [deployer] = await ethers.getSigners();
  console.log("检查账户地址:", deployer.address);

  // 获取余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("原始余额 (wei):", balance.toString());
  console.log("格式化余额 (AVAX):", ethers.formatEther(balance));

  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  console.log("网络信息:");
  console.log("- 链 ID:", network.chainId.toString());
  console.log("- 网络名称:", network.name);

  // 获取最新区块
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("最新区块号:", blockNumber);
}

main().catch((error) => {
  console.error("❌ 检查失败:", error);
  process.exitCode = 1;
});
