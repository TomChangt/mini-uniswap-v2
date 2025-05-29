import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    avalanche: {
      url: "http://127.0.0.1:56991/ext/bc/8DSe79B2FFnMNdC5sVYjzv3HmXJ2o6wfk3yuZou2YUBoenYrh/rpc",
      chainId: 202505300407,
      accounts: [
        // 使用测试私钥，实际项目中请使用环境变量
        "0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027",
        "0x208ca7bcd4b8dc729a9ada22b3863438756e5c3f397a6e6942e76acd7c1b508c",
      ],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
