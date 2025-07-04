# 🦄 Mini Uniswap V2 - 专业级去中心化交易所

一个基于 UniswapV2 协议的功能完整的去中心化交易所（DEX）MVP 项目，支持多代币交易、流动性管理和代币空投功能。

## ✨ 核心功能

### 🔗 钱包连接

- 支持 MetaMask 等 Web3 钱包连接
- 自动检测网络状态和连接状态
- 安全的私钥管理和交易签名

### 📥 代币管理

- **智能代币导入**：支持任意 ERC20 代币地址导入
- **本地存储**：已导入代币自动保存到本地，刷新不丢失
- **快速导入**：预设主流代币（USDT、ETH、AVAX、SOL）
- **余额实时更新**：每 30 秒自动刷新代币余额
- **存储管理**：支持代币数据导出/导入和清空功能

### 🔄 代币交换

- **AMM 算法**：基于 UniswapV2 恒定乘积做市商模型
- **智能路由**：自动寻找最优交易路径
- **滑点保护**：可自定义滑点容忍度（0.1% - 50%）
- **价格计算**：实时计算交换比例和最小接收数量
- **交换预览**：详细显示交换信息和手续费

### 💧 流动性管理

- **添加流动性**：向交易对提供流动性并获得 LP 代币
- **移除流动性**：灵活移除部分或全部流动性
- **收益分成**：流动性提供者自动获得交易手续费分成
- **LP 代币管理**：实时显示 LP 代币余额和价值

### 💰 代币空投

- **批量空投**：代币所有者可向指定地址空投代币
- **权限验证**：自动验证操作者是否为代币合约所有者
- **安全操作**：支持精确数量控制和交易确认

## 🆕 新增功能：智能多路径交换

### 功能概述

项目现已支持智能多路径代币交换功能，能够自动寻找最优交换路径，提供更好的交换价格和更低的滑点。

### 核心特性

- **智能路径查找**：自动搜索直接路径和多跳间接路径
- **最优路径选择**：基于输出金额自动选择最佳交换路径
- **价格影响分析**：实时计算并显示不同路径的价格影响
- **灵活路径配置**：支持最多 3 跳交换，搜索多达 5 条候选路径
- **实时路径比较**：并排显示所有可用路径及其详细信息

### 使用方法

1. 在交换界面开启"智能路由"开关
2. 输入交换数量，系统自动查找所有可用路径
3. 查看路径详情，包括价格影响和预期输出
4. 系统自动选择最优路径，也可手动选择偏好路径
5. 确认交换详情后执行交换

### 技术实现

- **PathFinder 类**：核心路径查找算法
- **智能合约兼容**：完全兼容 UniswapV2 路由器接口
- **前端集成**：无缝集成到现有交换界面
- **性能优化**：缓存和去重机制提高查找效率

## 🛠 技术栈

### 智能合约层

- **Solidity ^0.8.19**：智能合约开发语言
- **Hardhat**：以太坊开发环境和工具
- **OpenZeppelin**：安全的智能合约库

### 前端技术栈

- **React 18 + TypeScript**：现代化前端框架
- **Ethers.js v6**：以太坊区块链交互库
- **Tailwind CSS v3**：实用优先的 CSS 框架
- **自定义设计系统**：专业级 DApp UI 组件

### 区块链网络

- **Avalanche L1 本地测试网络**：高性能区块链测试环境
- **Hardhat Network**：本地区块链开发网络

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- MetaMask 浏览器扩展

### 1. 安装依赖

```bash
# 安装项目依赖
npm install

# 安装前端依赖
cd frontend && npm install
```

### 2. 编译智能合约

```bash
# 返回项目根目录
cd ..

# 编译合约
npx hardhat compile
```

### 3. 部署 Avalanche L1 本地网络

参照 [AVALANCHE_L1_NETWORK.md](AVALANCHE_L1_NETWORK.md) 文档，创建并部署 Avalanche L1 本地网络：

```bash
# 创建 Avalanche L1 配置
avalanche blockchain create avxL1

# 部署到本地
avalanche blockchain deploy avxL1 --local
```

### 4. 部署智能合约

```bash
# 部署合约到 Avalanche L1 本地网络
npx hardhat run scripts/deploy.js --network avalanche
```

### 5. 配置 MetaMask

添加 Avalanche L1 本地网络到 MetaMask：

- **网络名称**：Avalanche L1 Local
- **RPC URL**：http://127.0.0.1:58621/ext/bc/oHSfmKP2fJ6YtMjuYkSPDAsB7rosB5LGDnthz82HuM1s1gYBM/rpc
- **链 ID**：202505261834
- **货币符号**：AVX

导入测试账户私钥：

- 使用 ewoq 测试账户：`0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027`
- 或从 Avalanche-CLI 输出中获取其他测试账户私钥

> 📖 详细的网络配置步骤请参考 [AVALANCHE_L1_NETWORK.md](AVALANCHE_L1_NETWORK.md) 文档

### 6. 启动前端应用

```bash
# 进入前端目录
cd frontend

# 启动开发服务器
npm start
```

访问 http://localhost:3000 开始使用！

## 📚 使用指南

### 第一步：连接钱包

1. 点击右上角"连接钱包"按钮
2. 选择 MetaMask 并授权连接
3. 确保连接到正确的网络

### 第二步：导入代币

1. 进入"导入代币"页面
2. 选择快速导入预设代币，或输入自定义代币地址
3. 确认代币信息并导入

### 第三步：获取测试代币

1. 在已导入的代币列表中找到需要的代币
2. 点击代币卡片中的"领取"按钮
3. 确认交易以获取测试代币

### 第四步：交换代币

1. 进入"代币交换"页面
2. 选择要交换的代币对
3. 输入交换数量
4. 调整滑点设置（建议 0.5%-1%）
5. 确认交换详情并执行

### 第五步：管理流动性

1. 进入"流动性"页面
2. 选择要添加流动性的代币对
3. 输入两种代币的数量
4. 确认交易以获得 LP 代币
5. 在移除流动性时选择移除比例

![05](/assets/05.png)
![06](/assets/06.png)
![07](/assets/07.png)
![08](/assets/08.png)
![09](/assets/09.png)

## 🏗 项目架构

```
mini-uniswap-v2/
├── contracts/                 # 智能合约
│   ├── core/                 # 核心合约
│   │   ├── UniswapV2Factory.sol
│   │   └── UniswapV2Pair.sol
│   └── periphery/            # 外围合约
│       └── UniswapV2Router.sol
├── frontend/                 # 前端应用
│   ├── src/
│   │   ├── components/       # React 组件
│   │   ├── contexts/         # React 上下文
│   │   ├── contracts/        # 合约地址配置
│   │   └── utils/           # 工具函数
│   └── public/              # 静态资源
├── scripts/                 # 部署脚本
├── test/                   # 测试文件
└── ignition/               # 部署配置
```

## 🔐 安全特性

- **授权机制**：所有代币操作需要用户显式授权
- **滑点保护**：防止价格波动造成的意外损失
- **权限验证**：空投功能仅限代币所有者操作
- **交易预览**：详细显示交易信息供用户确认
- **错误处理**：完善的错误捕获和用户友好的提示

## 🎨 设计特色

### 专业级 UI/UX

- **深色主题**：专业的深色设计适合长时间使用
- **玻璃态效果**：现代化的毛玻璃卡片设计
- **动态背景**：精美的网格动画背景
- **响应式布局**：完美适配桌面和移动设备

### 交互体验

- **实时反馈**：所有操作都有加载状态和结果通知
- **智能提示**：上下文相关的帮助信息和操作指导
- **状态管理**：清晰的连接状态和网络状态显示
- **数据持久化**：本地存储用户偏好和代币列表

## 🧪 测试

### 合约测试

```bash
# 运行智能合约测试
npx hardhat test
```

### 前端测试

```bash
# 进入前端目录
cd frontend

# 运行前端测试
npm test
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

此项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关链接

- [UniswapV2 文档](https://docs.uniswap.org/protocol/V2/introduction)
- [Hardhat 文档](https://hardhat.org/docs)
- [Ethers.js 文档](https://docs.ethers.io/v6/)
- [React 文档](https://reactjs.org/docs)

## 📞 支持

如果您在使用过程中遇到问题或有改进建议，请：

1. 查看 [故障排除指南](TROUBLESHOOTING.md)
2. 提交 [Issue](https://github.com/yourname/mini-uniswap-v2/issues)
3. 参与 [讨论](https://github.com/yourname/mini-uniswap-v2/discussions)

---

**🎉 感谢使用 Mini Uniswap V2！享受去中心化交易的乐趣！**
