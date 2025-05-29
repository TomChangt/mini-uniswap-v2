import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  // 使用默认的第一个账户进行部署（有足够余额）
  const [deployer] = await ethers.getSigners();

  // 指定的目标账户地址
  const TARGET_ADDRESS = "0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC";

  console.log("正在使用部署账户:", deployer.address);
  console.log("目标账户:", TARGET_ADDRESS);
  console.log(
    "部署账户余额:",
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

  // 部署USDT代币
  console.log("\n部署 USDT...");
  const USDT = await ethers.getContractFactory("USDT");
  const usdt = await USDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("USDT 部署地址:", usdtAddress);

  // 部署ETH代币
  console.log("\n部署 ETH...");
  const ETH = await ethers.getContractFactory("ETH");
  const eth = await ETH.deploy();
  await eth.waitForDeployment();
  const ethAddress = await eth.getAddress();
  console.log("ETH 部署地址:", ethAddress);

  // 部署AVALANCHE代币
  console.log("\n部署 AVALANCHE...");
  const AVALANCHE = await ethers.getContractFactory("AVALANCHE");
  const avalanche = await AVALANCHE.deploy();
  await avalanche.waitForDeployment();
  const avalancheAddress = await avalanche.getAddress();
  console.log("AVALANCHE 部署地址:", avalancheAddress);

  // 部署SOLANA代币
  console.log("\n部署 SOLANA...");
  const SOLANA = await ethers.getContractFactory("SOLANA");
  const solana = await SOLANA.deploy();
  await solana.waitForDeployment();
  const solanaAddress = await solana.getAddress();
  console.log("SOLANA 部署地址:", solanaAddress);

  // 转移代币所有权给目标账户，并给目标账户mint代币
  console.log("\n转移代币所有权并mint代币给目标账户...");

  const usdtContract = await ethers.getContractAt("USDT", usdtAddress);
  const ethContract = await ethers.getContractAt("ETH", ethAddress);
  const avalancheContract = await ethers.getContractAt(
    "AVALANCHE",
    avalancheAddress
  );
  const solanaContract = await ethers.getContractAt("SOLANA", solanaAddress);

  // 给目标账户mint额外的代币（1000000 每种）
  const MINT_AMOUNT = ethers.parseUnits("1000000", 18);

  await usdtContract.mint(TARGET_ADDRESS, MINT_AMOUNT);
  await ethContract.mint(TARGET_ADDRESS, MINT_AMOUNT);
  await avalancheContract.mint(TARGET_ADDRESS, MINT_AMOUNT);
  await solanaContract.mint(TARGET_ADDRESS, MINT_AMOUNT);

  // 转移所有权给目标账户
  await usdtContract.transferOwnership(TARGET_ADDRESS);
  await ethContract.transferOwnership(TARGET_ADDRESS);
  await avalancheContract.transferOwnership(TARGET_ADDRESS);
  await solanaContract.transferOwnership(TARGET_ADDRESS);

  console.log("已将所有代币的所有权转移给:", TARGET_ADDRESS);

  // 保存合约地址到文件
  const addresses = {
    factory: factoryAddress,
    router: routerAddress,
    tokens: {
      USDT: usdtAddress,
      ETH: ethAddress,
      AVALANCHE: avalancheAddress,
      SOLANA: solanaAddress,
    },
    deployer: deployer.address,
    owner: TARGET_ADDRESS,
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

  // 验证代币余额和所有权
  console.log("\n代币信息:");
  console.log("USDT 名称:", await usdtContract.name());
  console.log("USDT 符号:", await usdtContract.symbol());
  console.log(
    "USDT 目标账户余额:",
    (await usdtContract.balanceOf(TARGET_ADDRESS)).toString()
  );
  console.log("USDT 所有者:", await usdtContract.owner());

  console.log("ETH 名称:", await ethContract.name());
  console.log("ETH 符号:", await ethContract.symbol());
  console.log(
    "ETH 目标账户余额:",
    (await ethContract.balanceOf(TARGET_ADDRESS)).toString()
  );
  console.log("ETH 所有者:", await ethContract.owner());

  console.log("AVALANCHE 名称:", await avalancheContract.name());
  console.log("AVALANCHE 符号:", await avalancheContract.symbol());
  console.log(
    "AVALANCHE 目标账户余额:",
    (await avalancheContract.balanceOf(TARGET_ADDRESS)).toString()
  );
  console.log("AVALANCHE 所有者:", await avalancheContract.owner());

  console.log("SOLANA 名称:", await solanaContract.name());
  console.log("SOLANA 符号:", await solanaContract.symbol());
  console.log(
    "SOLANA 目标账户余额:",
    (await solanaContract.balanceOf(TARGET_ADDRESS)).toString()
  );
  console.log("SOLANA 所有者:", await solanaContract.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
