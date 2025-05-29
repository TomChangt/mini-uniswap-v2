# Mini Uniswap V2 DEX - 多代币版本

基于 UniswapV2 协议的去中心化交易所（DEX），支持多种代币的导入、管理和空投功能。

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
│   ├── tokens/        # ERC20 代币合约
│   │   ├── USDT.sol      # 模拟 USDT 代币
│   │   ├── ETH.sol       # 模拟 ETH 代币
│   │   ├── AVALANCHE.sol # 模拟 AVAX 代币
│   │   └── SOLANA.sol    # 模拟 SOL 代币
│   └── periphery/     # Router 等外围合约
│       └── UniswapV2Router.sol
├── frontend/          # React 前端应用
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   │   ├── WalletConnect.tsx      # 钱包连接
│   │   │   ├── TokenImport.tsx        # 代币导入
│   │   │   ├── AirdropInterface.tsx   # 空投功能
│   │   │   └── NotificationContainer.tsx
│   │   ├── contexts/     # React 上下文
│   │   │   ├── Web3Context.tsx        # Web3 状态管理
│   │   │   └── NotificationContext.tsx
│   │   └── contracts/    # 合约地址和 ABI
│   │       └── addresses.json
├── scripts/           # 部署和初始化脚本
│   └── deploy.ts      # 智能合约部署脚本
├── test/             # 合约测试
└── README.md         # 项目文档
```

## 当前实现功能

### 1. 钱包连接与账户管理 ✅

- ✅ 支持 MetaMask 钱包连接
- ✅ 显示当前连接的账户地址
- ✅ 支持断开连接功能
- ✅ 自动检测网络和账户切换

### 2. 多代币管理系统 ✅

- ✅ 支持多种代币：USDT, ETH, AVALANCHE, SOLANA
- ✅ 动态代币导入功能
- ✅ 实时余额查询和显示
- ✅ 代币合约信息获取（名称、符号、精度）
- ✅ 统一的代币合约管理系统

### 3. 代币空投功能 ✅

- ✅ 代币所有者权限验证
- ✅ 单个地址空投功能
- ✅ 实时交易状态反馈
- ✅ 错误处理和用户提示

### 4. 用户界面 ✅

- ✅ 现代化玻璃拟态设计
- ✅ 响应式布局支持
- ✅ 实时通知系统
- ✅ 多标签页界面设计
- ✅ 动画和过渡效果

### 5. 智能合约部署 ✅

- ✅ 完整的合约部署脚本
- ✅ 自动化代币铸造和所有权转移
- ✅ 合约地址管理和保存
- ✅ 部署验证和测试

## 开发中功能

### 1. 代币交换功能 🚧

- 🚧 代币间交换接口
- 🚧 滑点设置和价格计算
- 🚧 路由器合约集成

### 2. 流动性管理 🚧

- 🚧 添加/移除流动性
- 🚧 LP 代币管理
- 🚧 流动性池状态显示

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

### 3. 启动本地网络（新终端窗口）

```bash
npx hardhat node
```

### 4. 部署合约

```bash
# 部署到本地网络
npx hardhat run scripts/deploy.ts --network localhost
```

### 5. 启动前端

```bash
cd frontend && npm start
```

前端将在 `http://localhost:3000` 启动。

## 使用指南

### 1. 连接钱包

- 确保已安装 MetaMask 浏览器扩展
- 点击右上角"连接钱包"按钮
- 在 MetaMask 中确认连接
- 确保连接到本地网络 (localhost:8545)

### 2. 导入代币

在"导入代币"标签页中：

- 使用快速导入按钮导入预设代币（USDT、ETH、AVAX、SOL）
- 或手动输入代币合约地址进行导入
- 系统会自动获取代币信息和余额

### 3. 执行空投

在"空投"标签页中：

- 选择要空投的代币（需要是代币所有者）
- 输入接收地址和空投数量
- 确认交易并等待执行完成

## 合约地址

部署后的合约地址保存在 `frontend/src/contracts/addresses.json` 文件中：

```json
{
  "factory": "工厂合约地址",
  "router": "路由器合约地址",
  "tokens": {
    "USDT": "USDT合约地址",
    "ETH": "ETH合约地址",
    "AVALANCHE": "AVALANCHE合约地址",
    "SOLANA": "SOLANA合约地址"
  },
  "deployer": "部署者地址",
  "owner": "所有者地址"
}
```

## 技术特色

### 1. 架构设计

- **模块化合约设计**：核心合约、代币合约、外围合约分离
- **动态代币系统**：支持任意 ERC20 代币的导入和管理
- **统一状态管理**：React Context 统一管理 Web3 状态
- **类型安全**：完整的 TypeScript 类型支持

### 2. 用户体验

- **实时反馈**：所有操作都有实时状态反馈
- **错误处理**：完善的错误处理和用户提示
- **响应式设计**：支持桌面和移动设备
- **现代化 UI**：玻璃拟态设计风格

### 3. 开发体验

- **热重载**：前端开发支持热重载
- **类型检查**：完整的 TypeScript 支持
- **代码规范**：ESLint 和 Prettier 代码规范
- **自动化部署**：一键部署和验证

## 注意事项

1. **仅用于学习和测试**：这是一个演示项目，不应用于生产环境
2. **私钥安全**：配置文件中的私钥仅用于测试，请勿在主网使用
3. **网络配置**：确保 MetaMask 连接到正确的本地网络
4. **代币权限**：空投功能需要代币所有者权限

## 故障排除

### 常见问题

1. **合约未部署**：

   - 确保先启动 `npx hardhat node`
   - 运行部署脚本 `npx hardhat run scripts/deploy.ts --network localhost`

2. **网络不匹配**：

   - 在 MetaMask 中添加本地网络：
     - 网络名称：Localhost 8545
     - RPC URL：http://localhost:8545
     - Chain ID：31337
     - 货币符号：ETH

3. **导入代币失败**：

   - 检查代币地址是否正确
   - 确认合约已正确部署
   - 检查网络连接状态

4. **空投失败**：
   - 确认是代币所有者（目标账户：0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC）
   - 检查 Gas 费用是否足够
   - 确认接收地址格式正确

### 重新部署

如果需要重新部署合约：

```bash
# 停止当前节点，重新启动
npx hardhat node

# 重新部署（新终端）
npx hardhat run scripts/deploy.ts --network localhost

# 刷新前端页面
```

## 下一步开发计划

1. **完善交换功能**

   - 实现代币间直接交换
   - 添加滑点保护和价格计算
   - 支持多路径路由

2. **流动性管理**

   - 实现添加/移除流动性功能
   - LP 代币质押和奖励
   - 流动性挖矿功能

3. **高级功能**

   - 交易历史记录
   - 价格图表显示
   - 批量操作支持

4. **部署优化**
   - 支持测试网部署
   - 合约验证和开源
   - 前端部署和域名配置

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

MIT License
