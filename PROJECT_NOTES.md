# Mini Uniswap V2 DEX

基于 UniswapV2 协议的去中心化交易所（DEX）最小可行产品（MVP），实现基本的代币交换和流动性提供功能。

## 技术栈

- **智能合约**: Solidity + Hardhat
- **前端**: React + TypeScript + Tailwind CSS
- **Web3 集成**: Ethers.js v6
- **区块链网络**: Avalanche L1 本地测试网络

## 项目结构

```
mini-uniswap-v2/
├── contracts/          # 智能合约
│   ├── core/          # UniswapV2 核心合约
│   │   ├── UniswapV2Factory.sol
│   │   └── UniswapV2Pair.sol
│   ├── tokens/        # ERC20 测试代币
│   │   ├── TokenA.sol
│   │   └── TokenB.sol
│   └── periphery/     # Router 等外围合约
│       └── UniswapV2Router.sol
├── frontend/          # React 前端应用
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── contexts/     # React 上下文
│   │   └── contracts/    # 合约地址和 ABI
├── scripts/           # 部署和初始化脚本
├── test/             # 合约测试
└── README.md         # 项目文档
```

## 核心功能

### 1. 钱包连接与账户管理

- ✅ 支持 MetaMask 钱包连接
- ✅ 显示当前连接的账户地址
- ✅ 显示原生代币（AVAX）余额
- ✅ 支持断开连接功能
- ✅ 自动检测网络切换

### 2. 代币管理

- ✅ 部署两个 ERC20 测试代币（TokenA 和 TokenB）
- ✅ 实现代币铸造功能（水龙头功能）
- ✅ 显示用户的代币余额
- ✅ 支持代币授权（Approve）操作

### 3. 交易功能

- ✅ 输入代币数量，实时计算可获得的代币数量
- ✅ 支持滑点容忍度设置（0.5%, 1%, 3%）
- ✅ 显示最小获得数量和汇率信息
- ✅ 支持代币交换方向切换

### 4. 流动性管理

- ✅ 添加流动性（创建新交易对或向现有交易对添加）
- ✅ 移除流动性（支持按百分比移除）
- ✅ 显示 LP 代币余额和预计获得数量
- ✅ 自动计算配对比例

## 快速开始

### 1. 安装依赖

```bash
# 安装项目依赖
npm install

# 安装前端依赖
cd frontend
npm install
cd ..
```

### 2. 编译合约

```bash
npx hardhat compile
```

### 3. 部署合约

```bash
# 署到 Avalanche 本地网络（需要先启动 Avalanche 节点）
npx hardhat run scripts/deploy.ts --network avalanche
```

### 4. 启动前端

```bash
cd frontend && npm start

```

前端将在 `http://localhost:3000` 启动。

## 使用指南

### 1. 连接钱包

- 确保已安装 MetaMask 浏览器扩展
- 点击"连接钱包"按钮
- 在 MetaMask 中确认连接

### 2. 获取测试代币

- 在左侧代币余额区域，点击"获取测试代币"按钮
- 每次可获得 1000 个测试代币
- 每个地址最多可获得 10000 个代币

### 3. 添加流动性

- 切换到"流动性管理"标签
- 选择"添加流动性"
- 输入要添加的 TokenA 和 TokenB 数量
- 点击"添加流动性"并在 MetaMask 中确认交易

### 4. 代币交换

- 在"代币交换"标签中
- 输入要交换的代币数量
- 系统会自动计算输出数量
- 设置滑点容忍度
- 点击"交换"并确认交易

### 5. 移除流动性

- 在"流动性管理"中选择"移除流动性"
- 选择要移除的百分比（25%, 50%, 75%, 100%）
- 查看预计获得的代币数量
- 点击"移除流动性"并确认交易

## 合约地址

部署后的合约地址会自动保存在 `frontend/src/contracts/addresses.json` 文件中。

## 开发说明

### 智能合约

- `UniswapV2Factory`: 工厂合约，用于创建交易对
- `UniswapV2Pair`: 交易对合约，实现 AMM 算法
- `UniswapV2Router`: 路由器合约，提供用户友好的接口
- `TokenA/TokenB`: ERC20 测试代币，包含水龙头功能

### 前端架构

- 使用 React Context 管理 Web3 状态
- 组件化设计，易于维护和扩展
- 响应式设计，支持移动端
- 实时数据更新和错误处理

## 注意事项

1. **仅用于学习和测试**: 这是一个演示项目，不应用于生产环境
2. **私钥安全**: 配置文件中的私钥仅用于测试，请勿在主网使用
3. **网络配置**: 确保 MetaMask 连接到正确的网络
4. **Gas 费用**: 在测试网络中进行交易需要测试代币作为 Gas 费

## 故障排除

### 常见问题

1. **合约未部署**: 确保先运行部署脚本
2. **网络不匹配**: 检查 MetaMask 网络设置
3. **余额不足**: 使用水龙头获取测试代币
4. **交易失败**: 检查滑点设置和代币授权

### 重新部署

如果需要重新部署合约：

```bash
# 清理缓存
npx hardhat clean

# 重新编译
npx hardhat compile

# 重新部署
npx hardhat run scripts/deploy.ts --network avalanche
```

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

MIT License
