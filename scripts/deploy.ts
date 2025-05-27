import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("正在使用账户部署合约:", deployer.address);
  console.log(
    "账户余额:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // 部署工厂合约
  console.log("\n部署 UniswapV2Factory...");
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("UniswapV2Factory 部署地址:", factoryAddress);

  // 部署路由器合约
  console.log("\n部署 UniswapV2Router...");
  const Router = await ethers.getContractFactory("UniswapV2Router");
  const router = await Router.deploy(factoryAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("UniswapV2Router 部署地址:", routerAddress);

  // 部署测试代币 TokenA
  console.log("\n部署 TokenA...");
  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy();
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("TokenA 部署地址:", tokenAAddress);

  // 部署测试代币 TokenB
  console.log("\n部署 TokenB...");
  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy();
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("TokenB 部署地址:", tokenBAddress);

  // 保存合约地址到文件
  const addresses = {
    factory: factoryAddress,
    router: routerAddress,
    tokenA: tokenAAddress,
    tokenB: tokenBAddress,
    deployer: deployer.address,
  };

  const contractsDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  console.log("\n合约地址已保存到 frontend/src/contracts/addresses.json");
  console.log("部署完成！");

  // 验证部署
  console.log("\n验证部署...");
  const factoryContract = await ethers.getContractAt(
    "UniswapV2Factory",
    factoryAddress
  );
  const routerContract = await ethers.getContractAt(
    "UniswapV2Router",
    routerAddress
  );

  console.log("Factory feeTo:", await factoryContract.feeTo());
  console.log("Factory feeToSetter:", await factoryContract.feeToSetter());
  console.log("Router factory:", await routerContract.factory());

  const tokenAContract = await ethers.getContractAt("TokenA", tokenAAddress);
  const tokenBContract = await ethers.getContractAt("TokenB", tokenBAddress);

  console.log("TokenA 名称:", await tokenAContract.name());
  console.log("TokenA 符号:", await tokenAContract.symbol());
  console.log(
    "TokenA 总供应量:",
    (await tokenAContract.totalSupply()).toString()
  );

  console.log("TokenB 名称:", await tokenBContract.name());
  console.log("TokenB 符号:", await tokenBContract.symbol());
  console.log(
    "TokenB 总供应量:",
    (await tokenBContract.totalSupply()).toString()
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
