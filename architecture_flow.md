# Mini Uniswap V2 系统架构流程图

## 完整系统架构流程图 (Mermaid)

```mermaid
graph TB
    %% 用户界面层
    subgraph "🎨 用户界面层"
        UI[React TypeScript 前端应用]
        Components[UI 组件]
        Contexts[React Contexts]
        Utils[工具函数]
    end

    %% Web3 交互层
    subgraph "🔗 Web3 交互层"
        MetaMask[MetaMask 钱包]
        Ethers[Ethers.js v6]
        Web3Provider[Web3 Provider]
        Signer[交易签名者]
    end

    %% 智能合约层
    subgraph "📜 智能合约层"
        Factory[UniswapV2Factory.sol]
        Router[UniswapV2Router.sol]
        Pair[UniswapV2Pair.sol]
        ERC20[ERC20 代币合约]
    end

    %% 区块链网络层
    subgraph "⛓️ 区块链网络"
        Hardhat[Hardhat 本地网络]
        Avalanche[Avalanche L1 测试网]
        Ethereum[以太坊主网]
    end

    %% 核心功能模块
    subgraph "🔄 代币交换模块"
        SwapUI[SwapInterface 组件]
        PriceCalc[价格计算算法]
        SlippageProtection[滑点保护机制]
        TokenApproval[代币授权流程]
    end

    subgraph "💧 流动性管理模块"
        LiquidityUI[LiquidityInterface 组件]
        AddLiquidity[添加流动性]
        RemoveLiquidity[移除流动性]
        LPTokens[LP 代币管理]
    end

    subgraph "📥 代币管理模块"
        TokenImport[TokenImport 组件]
        TokenStorage[本地存储管理]
        BalanceUpdater[余额更新器]
        TokenInfo[代币信息获取]
    end

    subgraph "💰 空投模块"
        AirdropUI[AirdropInterface 组件]
        OwnerVerification[所有者验证]
        BatchTransfer[批量转账]
    end

    %% 数据流连接
    UI --> Components
    Components --> Contexts
    Contexts --> Web3Provider
    Web3Provider --> Ethers
    Ethers --> MetaMask
    MetaMask --> Signer

    %% 智能合约交互
    Signer --> Factory
    Signer --> Router
    Signer --> Pair
    Signer --> ERC20

    %% 网络部署
    Factory --> Hardhat
    Router --> Hardhat
    Pair --> Hardhat
    ERC20 --> Hardhat

    %% 功能模块交互
    Components --> SwapUI
    Components --> LiquidityUI
    Components --> TokenImport
    Components --> AirdropUI

    SwapUI --> PriceCalc
    SwapUI --> SlippageProtection
    SwapUI --> TokenApproval

    LiquidityUI --> AddLiquidity
    LiquidityUI --> RemoveLiquidity
    LiquidityUI --> LPTokens

    TokenImport --> TokenStorage
    TokenImport --> BalanceUpdater
    TokenImport --> TokenInfo

    AirdropUI --> OwnerVerification
    AirdropUI --> BatchTransfer

    %% 样式定义
    classDef uiClass fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef web3Class fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef contractClass fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef networkClass fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef moduleClass fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class UI,Components,Contexts,Utils uiClass
    class MetaMask,Ethers,Web3Provider,Signer web3Class
    class Factory,Router,Pair,ERC20 contractClass
    class Hardhat,Avalanche,Ethereum networkClass
    class SwapUI,LiquidityUI,TokenImport,AirdropUI moduleClass
```

## 代币交换流程图

```mermaid
sequenceDiagram
    participant User as 👤 用户
    participant UI as 🖥️ 交换界面
    participant Web3 as 🔗 Web3Context
    participant Router as 📜 Router合约
    participant Token as 🪙 ERC20代币
    participant Pair as 💱 交易对合约

    User->>UI: 1. 选择代币对和数量
    UI->>Web3: 2. 计算输出金额
    Web3->>Router: 3. getAmountsOut()
    Router-->>Web3: 4. 返回预期输出
    Web3-->>UI: 5. 显示交换信息

    User->>UI: 6. 确认交换
    UI->>Web3: 7. 检查代币授权
    Web3->>Token: 8. allowance()

    alt 需要授权
        Web3->>Token: 9. approve()
        Token-->>Web3: 10. 授权成功
    end

    Web3->>Router: 11. swapExactTokensForTokens()
    Router->>Pair: 12. 执行交换
    Pair->>Token: 13. 转移代币
    Token-->>Pair: 14. 转移完成
    Pair-->>Router: 15. 交换完成
    Router-->>Web3: 16. 交易成功
    Web3-->>UI: 17. 更新界面
    UI-->>User: 18. 显示成功消息
```

## 流动性管理流程图

```mermaid
sequenceDiagram
    participant User as 👤 用户
    participant UI as 🖥️ 流动性界面
    participant Web3 as 🔗 Web3Context
    participant Factory as 🏭 Factory合约
    participant Router as 📜 Router合约
    participant Pair as 💱 交易对合约
    participant TokenA as 🪙 代币A
    participant TokenB as 🪙 代币B

    Note over User,TokenB: 添加流动性流程

    User->>UI: 1. 选择代币对和数量
    UI->>Web3: 2. 检查交易对是否存在
    Web3->>Factory: 3. getPair()
    Factory-->>Web3: 4. 返回交易对地址

    User->>UI: 5. 确认添加流动性
    UI->>Web3: 6. 授权代币A和B
    Web3->>TokenA: 7. approve(Router)
    Web3->>TokenB: 8. approve(Router)

    Web3->>Router: 9. addLiquidity()
    Router->>Pair: 10. mint LP tokens
    Pair->>TokenA: 11. transferFrom()
    Pair->>TokenB: 12. transferFrom()
    Pair-->>Router: 13. 返回LP代币
    Router-->>Web3: 14. 添加成功
    Web3-->>UI: 15. 更新界面
    UI-->>User: 16. 显示成功消息

    Note over User,TokenB: 移除流动性流程

    User->>UI: 17. 选择移除比例
    UI->>Web3: 18. 获取LP代币余额
    Web3->>Pair: 19. balanceOf()

    User->>UI: 20. 确认移除流动性
    Web3->>Pair: 21. approve(Router)
    Web3->>Router: 22. removeLiquidity()
    Router->>Pair: 23. burn LP tokens
    Pair->>TokenA: 24. transfer()
    Pair->>TokenB: 25. transfer()
    Router-->>Web3: 26. 移除成功
    Web3-->>UI: 27. 更新界面
    UI-->>User: 28. 显示成功消息
```

## 代币导入和管理流程图

```mermaid
flowchart TD
    Start([开始导入代币]) --> Input[输入代币地址]
    Input --> Validate{验证地址有效性}

    Validate -->|无效| Error1[显示错误信息]
    Validate -->|有效| GetInfo[获取代币信息]

    GetInfo --> Contract[调用合约方法]
    Contract --> Name[name()]
    Contract --> Symbol[symbol()]
    Contract --> Decimals[decimals()]
    Contract --> Balance[balanceOf()]

    Name --> Combine[合并代币信息]
    Symbol --> Combine
    Decimals --> Combine
    Balance --> Combine

    Combine --> Save[保存到本地存储]
    Save --> Update[更新UI显示]
    Update --> Success[导入成功]

    Contract -->|调用失败| Error2[显示错误信息]
    Error1 --> End([结束])
    Error2 --> End
    Success --> End

    %% 本地存储管理
    subgraph Storage[本地存储管理]
        LocalStorage[(localStorage)]
        Export[导出数据]
        Import[导入数据]
        Clear[清空数据]
    end

    Save --> LocalStorage
    LocalStorage --> Export
    LocalStorage --> Import
    LocalStorage --> Clear

    %% 余额更新
    subgraph BalanceUpdate[余额更新机制]
        Timer[30秒定时器]
        Manual[手动刷新]
        Auto[自动更新]
    end

    Success --> Timer
    Timer --> Auto
    Manual --> Auto
    Auto --> Contract
```

## 技术栈架构图

```mermaid
graph TB
    %% 前端技术栈
    subgraph "🎨 前端技术栈"
        React[React 18]
        TypeScript[TypeScript]
        TailwindCSS[Tailwind CSS v3]
        CustomComponents[自定义设计系统]
    end

    %% Web3 技术栈
    subgraph "🔗 Web3 技术栈"
        EthersJS[Ethers.js v6]
        MetaMaskSDK[MetaMask SDK]
        Web3Modal[Web3 连接管理]
        JSONRPCProvider[JSON-RPC Provider]
    end

    %% 智能合约技术栈
    subgraph "📜 智能合约技术栈"
        Solidity[Solidity ^0.8.19]
        OpenZeppelin[OpenZeppelin 库]
        UniswapV2Core[UniswapV2 核心协议]
        ERC20Standard[ERC20 标准]
    end

    %% 开发工具链
    subgraph "🛠️ 开发工具链"
        HardhatFramework[Hardhat 框架]
        TypeChain[TypeChain 类型生成]
        ESLint[ESLint 代码检查]
        Prettier[Prettier 代码格式化]
    end

    %% 网络基础设施
    subgraph "⛓️ 网络基础设施"
        HardhatNetwork[Hardhat 本地网络]
        AvalancheL1[Avalanche L1 测试网]
        JSONRPC[JSON-RPC 接口]
        EVMCompatible[EVM 兼容]
    end

    %% 连接关系
    React --> TypeScript
    TypeScript --> TailwindCSS
    TailwindCSS --> CustomComponents

    EthersJS --> MetaMaskSDK
    EthersJS --> Web3Modal
    EthersJS --> JSONRPCProvider

    Solidity --> OpenZeppelin
    Solidity --> UniswapV2Core
    OpenZeppelin --> ERC20Standard

    HardhatFramework --> TypeChain
    HardhatFramework --> ESLint
    HardhatFramework --> Prettier

    HardhatNetwork --> AvalancheL1
    AvalancheL1 --> JSONRPC
    JSONRPC --> EVMCompatible

    %% 跨层连接
    CustomComponents --> EthersJS
    EthersJS --> Solidity
    HardhatFramework --> HardhatNetwork
    TypeChain --> TypeScript
```

## 数据流向图

```mermaid
graph LR
    %% 用户操作起点
    User[👤 用户操作] --> UI[🖥️ 用户界面]

    %% UI 层数据流
    UI --> State[📊 状态管理]
    State --> Context[🔄 React Context]

    %% Web3 连接层
    Context --> Web3Provider[🔗 Web3 Provider]
    Web3Provider --> Wallet[👛 钱包连接]
    Web3Provider --> Contracts[📜 合约实例]

    %% 智能合约交互
    Contracts --> Factory[🏭 Factory 合约]
    Contracts --> Router[🛣️ Router 合约]
    Contracts --> Tokens[🪙 代币合约]

    %% 数据存储
    State --> LocalStorage[💾 本地存储]
    LocalStorage --> TokenData[🏷️ 代币数据]
    LocalStorage --> UserPrefs[⚙️ 用户偏好]

    %% 网络通信
    Factory --> Network[🌐 区块链网络]
    Router --> Network
    Tokens --> Network

    %% 反馈循环
    Network --> Events[📡 事件监听]
    Events --> Notifications[🔔 通知系统]
    Notifications --> UI

    %% 样式定义
    classDef userClass fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef uiClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef web3Class fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef contractClass fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef storageClass fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class User userClass
    class UI,State,Context,Notifications uiClass
    class Web3Provider,Wallet,Events web3Class
    class Contracts,Factory,Router,Tokens,Network contractClass
    class LocalStorage,TokenData,UserPrefs storageClass
```

## 安全架构图

```mermaid
graph TB
    %% 用户层安全
    subgraph "👤 用户层安全"
        MetaMaskSecurity[MetaMask 私钥管理]
        TransactionSigning[交易签名验证]
        UserConfirmation[用户确认机制]
    end

    %% 前端安全
    subgraph "🛡️ 前端安全"
        InputValidation[输入验证]
        AddressValidation[地址格式验证]
        AmountValidation[数量有效性检查]
        SlippageProtection[滑点保护]
    end

    %% 智能合约安全
    subgraph "📜 合约安全"
        AccessControl[访问控制]
        ReentrancyGuard[重入攻击防护]
        SafeMath[安全数学运算]
        OwnershipVerification[所有权验证]
    end

    %% 网络安全
    subgraph "🌐 网络安全"
        HTTPSConnection[HTTPS 连接]
        RPCValidation[RPC 请求验证]
        NetworkDetection[网络检测]
        FrontrunningProtection[抢跑交易保护]
    end

    %% 数据安全
    subgraph "💾 数据安全"
        LocalStorageEncryption[本地存储加密]
        SensitiveDataHandling[敏感数据处理]
        SecureBackup[安全备份机制]
    end

    %% 安全流程连接
    MetaMaskSecurity --> InputValidation
    TransactionSigning --> AccessControl
    UserConfirmation --> ReentrancyGuard

    InputValidation --> HTTPSConnection
    AddressValidation --> RPCValidation
    AmountValidation --> NetworkDetection
    SlippageProtection --> FrontrunningProtection

    AccessControl --> LocalStorageEncryption
    SafeMath --> SensitiveDataHandling
    OwnershipVerification --> SecureBackup
```

# 空投功能修复说明

## 问题描述

之前版本的空投功能存在设计问题：

- `airdropSingle` 和 `airdrop` 函数使用 `_mint()` 铸造新代币
- 这导致空投时不会从发送者余额中扣除代币
- 而是凭空创造新代币，增加总供应量

## 修复方案

将所有代币合约的空投函数改为使用 `_transfer()`：

```solidity
// 修复前（错误）
function airdropSingle(address recipient, uint256 amount) public onlyOwner {
    _mint(recipient, amount);  // 凭空创造代币
}

// 修复后（正确）
function airdropSingle(address recipient, uint256 amount) public onlyOwner {
    _transfer(msg.sender, recipient, amount);  // 从发送者转账
}
```

## 修复效果

- ✅ 空投后发送者余额正确减少
- ✅ 总供应量保持不变
- ✅ 符合正常的代币转账逻辑
- ✅ 确保空投发送者有足够余额

## 影响的合约

- USDT.sol
- ETH.sol
- AVALANCHE.sol
- SOLANA.sol

## 修复后的空投流程图

```mermaid
graph TD
    A[用户发起空投] --> B{检查所有者权限}
    B -->|不是所有者| C[权限错误提示]
    B -->|是所有者| D{检查余额是否足够}
    D -->|余额不足| E[余额不足提示]
    D -->|余额充足| F[执行_transfer转账]
    F --> G[扣减发送者余额]
    F --> H[增加接收者余额]
    G --> I[空投成功]
    H --> I
    I --> J[更新前端余额显示]

    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style I fill:#a5d6a7
    style C fill:#ffcdd2
    style E fill:#ffcdd2
```

## 空投前后余额变化对比

```mermaid
graph LR
    subgraph "修复前（错误）"
        A1[发送者: 1000 USDT] --> A2[发送者: 1000 USDT]
        A3[接收者: 0 USDT] --> A4[接收者: 100 USDT]
        A5[总供应量: 1,000,000] --> A6[总供应量: 1,000,100]
        A2 -.-> A7[❌ 发送者余额未减少]
        A6 -.-> A8[❌ 总供应量增加]
    end

    subgraph "修复后（正确）"
        B1[发送者: 1000 USDT] --> B2[发送者: 900 USDT]
        B3[接收者: 0 USDT] --> B4[接收者: 100 USDT]
        B5[总供应量: 1,000,000] --> B6[总供应量: 1,000,000]
        B2 -.-> B7[✅ 发送者余额正确减少]
        B6 -.-> B8[✅ 总供应量保持不变]
    end

    style A7 fill:#ffcdd2
    style A8 fill:#ffcdd2
    style B7 fill:#c8e6c9
    style B8 fill:#c8e6c9
```

## 前端余额刷新机制流程图

```mermaid
sequenceDiagram
    participant User as 👤 用户
    participant UI as 🖥️ 空投界面
    participant AirdropComp as 📦 AirdropInterface
    participant Web3Ctx as 🔗 Web3Context
    participant Contract as 📜 代币合约
    participant BalanceDisplay as 📊 余额显示

    User->>UI: 1. 点击"执行空投"
    UI->>Contract: 2. 调用airdropSingle()
    Contract-->>UI: 3. 交易成功
    UI->>AirdropComp: 4. 触发onBalanceUpdate回调
    AirdropComp->>Web3Ctx: 5. 调用refreshAllTokenBalances()

    loop 刷新每个代币余额
        Web3Ctx->>Contract: 6. 调用balanceOf()
        Contract-->>Web3Ctx: 7. 返回最新余额
        Web3Ctx->>Web3Ctx: 8. 更新tokenBalances状态
    end

    Web3Ctx-->>BalanceDisplay: 9. 通知余额状态更新
    BalanceDisplay-->>User: 10. 显示最新余额

    Note over User,BalanceDisplay: 用户看到余额实时更新
```

## 余额更新机制对比

```mermaid
graph TD
    subgraph "修复前（问题）"
        A1[空投成功] --> A2[显示成功消息]
        A2 --> A3[余额显示不变]
        A3 --> A4[❌ 用户困惑]
    end

    subgraph "修复后（正确）"
        B1[空投成功] --> B2[触发余额刷新]
        B2 --> B3[调用refreshAllTokenBalances]
        B3 --> B4[更新所有代币余额]
        B4 --> B5[✅ 左侧余额实时更新]
    end

    style A3 fill:#ffcdd2
    style A4 fill:#ffcdd2
    style B4 fill:#c8e6c9
    style B5 fill:#a5d6a7
```

# 交换和流动性操作余额刷新修复说明

## 问题描述

在之前的版本中，只有空投功能具备余额刷新机制：

- 交换代币成功后，左侧余额显示不会更新
- 添加/移除流动性成功后，左侧余额显示不会更新
- 用户需要手动刷新页面才能看到最新余额

## 修复方案

为 SwapInterface 和 LiquidityInterface 组件添加与 AirdropInterface 相同的余额刷新机制：

### 1. 接口扩展

```typescript
// SwapInterface.tsx
interface SwapInterfaceProps {
  importedTokens: TokenInfo[];
  onBalanceUpdate?: () => void; // 新增回调
}

// LiquidityInterface.tsx
interface LiquidityInterfaceProps {
  importedTokens: TokenInfo[];
  onBalanceUpdate?: () => void; // 新增回调
}
```

### 2. 成功回调调用

```typescript
// SwapInterface - 交换成功后
await swapTx.wait();
addNotification({
  type: "success",
  title: "交换成功",
  message: "代币交换成功！",
});

// 刷新余额
if (onBalanceUpdate) {
  onBalanceUpdate();
}

// LiquidityInterface - 添加流动性成功后
await tx.wait();
addNotification({
  type: "success",
  title: "添加成功",
  message: "流动性添加成功！",
});

// 刷新余额
if (onBalanceUpdate) {
  onBalanceUpdate();
}
```

### 3. App.tsx 集成

```typescript
// 传递余额刷新回调给所有操作组件
{
  activeTab === "swap" && (
    <SwapInterface
      importedTokens={importedTokens}
      onBalanceUpdate={handleBalanceUpdate} // 新增
    />
  );
}
{
  activeTab === "liquidity" && (
    <LiquidityInterface
      importedTokens={importedTokens}
      onBalanceUpdate={handleBalanceUpdate} // 新增
    />
  );
}
```

## 修复效果

- ✅ 代币交换成功后左侧余额自动刷新
- ✅ 添加流动性成功后左侧余额自动刷新
- ✅ 移除流动性成功后左侧余额自动刷新
- ✅ 统一的余额刷新机制，用户体验一致
- ✅ 无需手动刷新页面即可看到最新余额

## 统一余额刷新流程图

```mermaid
sequenceDiagram
    participant User as 👤 用户
    participant UI as 🖥️ 操作界面
    participant Component as 📦 功能组件
    participant Web3Ctx as 🔗 Web3Context
    participant Contract as 📜 智能合约
    participant BalanceDisplay as 📊 余额显示

    User->>UI: 1. 执行操作(交换/流动性/空投)
    UI->>Contract: 2. 调用合约方法
    Contract-->>UI: 3. 操作成功
    UI->>Component: 4. 触发onBalanceUpdate回调
    Component->>Web3Ctx: 5. 调用refreshAllTokenBalances()

    loop 刷新每个代币余额
        Web3Ctx->>Contract: 6. 调用balanceOf()
        Contract-->>Web3Ctx: 7. 返回最新余额
        Web3Ctx->>Web3Ctx: 8. 更新tokenBalances状态
    end

    Web3Ctx-->>BalanceDisplay: 9. 通知余额状态更新
    BalanceDisplay-->>User: 10. 显示最新余额

    Note over User,BalanceDisplay: 所有操作均支持余额自动刷新
```

## 功能覆盖对比

```mermaid
graph TD
    subgraph "修复前"
        A1[空投操作] --> A2[✅ 余额刷新]
        A3[交换操作] --> A4[❌ 无刷新]
        A5[流动性操作] --> A6[❌ 无刷新]
    end

    subgraph "修复后"
        B1[空投操作] --> B2[✅ 余额刷新]
        B3[交换操作] --> B4[✅ 余额刷新]
        B5[流动性操作] --> B6[✅ 余额刷新]
    end

    style A4 fill:#ffcdd2
    style A6 fill:#ffcdd2
    style B2 fill:#c8e6c9
    style B4 fill:#c8e6c9
    style B6 fill:#c8e6c9
```

## 技术实现细节

### 回调机制统一

所有主要操作组件现在都支持相同的回调接口：

- `AirdropInterface` - 空投成功后刷新
- `SwapInterface` - 交换成功后刷新
- `LiquidityInterface` - 流动性操作成功后刷新

### 状态管理集中

通过 Web3Context 的`refreshAllTokenBalances`方法统一管理余额刷新：

- 自动刷新所有已导入的代币余额
- 更新全局 tokenBalances 状态
- 触发 UI 重新渲染显示最新数据

### 用户体验优化

- 操作成功即时反馈余额变化
- 无需用户手动刷新页面
- 保持界面响应性和数据一致性
- 统一的操作体验

# 余额显示不一致问题修复说明

## 问题描述

在前端界面中发现了余额显示不一致的问题：

- **左侧已导入代币列表**：显示实时的链上余额数据（通过 Web3Context.tokenBalances）
- **右侧操作界面（交换/流动性/空投）**：显示导入时记录的过时余额数据（通过 importedTokens.balance）

这导致用户看到的余额数据前后不一致，造成混淆。

## 数据源分析

### 修复前的数据流

```mermaid
graph LR
    subgraph "左侧余额显示"
        A1[Web3Context.tokenBalances] --> A2[实时链上数据]
        A2 --> A3[显示: 1979000.0000 USDT]
    end

    subgraph "右侧余额显示"
        B1[importedTokens.balance] --> B2[导入时记录数据]
        B2 --> B3[显示: 1999900.0000 USDT]
    end

    A3 -.-> C[❌ 数据不一致]
    B3 -.-> C

    style C fill:#ffcdd2
```

### 修复后的数据流

```mermaid
graph LR
    subgraph "统一数据源"
        A1[Web3Context.tokenBalances] --> A2[实时链上数据]
        A2 --> A3[左侧显示]
        A2 --> A4[右侧显示]
    end

    A3 --> C[✅ 数据一致]
    A4 --> C

    style C fill:#c8e6c9
```

## 修复方案

### 1. SwapInterface 组件修复

```typescript
// 修复前
const { signer, routerContract, isConnected } = useWeb3();

// 余额显示
{
  fromToken ? parseFloat(fromToken.balance).toFixed(4) : "0.0000";
}

// 修复后
const { signer, routerContract, isConnected, tokenBalances } = useWeb3();

// 余额显示
{
  fromToken
    ? parseFloat(tokenBalances[fromToken.address] || "0").toFixed(4)
    : "0.0000";
}
```

### 2. LiquidityInterface 组件修复

```typescript
// 修复前
余额: {
  parseFloat(tokenA.balance).toFixed(4);
}
{
  tokenA.symbol;
}

// 修复后
余额: {
  parseFloat(tokenBalances[tokenA.address] || "0").toFixed(4);
}
{
  tokenA.symbol;
}
```

### 3. AirdropInterface 组件修复

```typescript
// 修复前
{
  parseFloat(selectedTokenInfo.balance).toFixed(4);
}
{
  selectedTokenInfo.symbol;
}

// 修复后
{
  parseFloat(tokenBalances[selectedTokenInfo.address] || "0").toFixed(4);
}
{
  selectedTokenInfo.symbol;
}
```

## 修复效果

- ✅ **数据源统一**：所有组件都使用 Web3Context.tokenBalances 作为唯一数据源
- ✅ **实时准确**：余额显示实时反映链上最新状态
- ✅ **用户体验**：左右余额数据一致，消除用户困惑
- ✅ **数据同步**：操作成功后余额立即更新，无需手动刷新

## 技术细节

### 数据获取机制

Web3Context 通过以下方式确保数据准确性：

1. **初始化时自动获取所有代币余额**
2. **操作成功后通过 refreshAllTokenBalances 刷新**
3. **账户变化时重新获取余额**
4. **网络变化时重新初始化**

### 容错处理

```typescript
// 使用安全的默认值防止显示错误
parseFloat(tokenBalances[tokenAddress] || "0").toFixed(4);
```

### 组件架构统一

现在所有主要操作组件都遵循统一的模式：

1. 从 Web3Context 获取 tokenBalances
2. 使用相同的格式化方法显示余额
3. 操作成功后调用 onBalanceUpdate 刷新

# 移除流动性功能问题修复说明

## 问题描述

用户在使用移除流动性功能时遇到错误，显示"移除失败 - 移除流动性失败"。经过分析发现是前端代码中 LP 代币授权机制和 ABI 定义不完整导致的。

## 问题分析

### 1. LP 代币授权机制问题

路由器合约的`removeLiquidity`函数需要：

1. 用户授权 LP 代币给路由器合约
2. 路由器调用`transferFrom`将 LP 代币转移到交易对合约
3. 交易对合约执行`burn`操作返还底层代币

### 2. ABI 定义不完整

原始的 PAIR_ABI 缺少关键的授权函数：

- `approve(address spender, uint256 amount)`
- `allowance(address owner, address spender)`
- `transferFrom(address from, address to, uint256 amount)`

## 修复方案

### 1. 完善 PAIR_ABI 定义

```typescript
const PAIR_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function approve(address spender, uint256 amount) returns (bool)", // 新增
  "function allowance(address owner, address spender) view returns (uint256)", // 新增
  "function transferFrom(address from, address to, uint256 amount) returns (bool)", // 新增
];
```

### 2. 改进授权检查逻辑

```typescript
// 检查当前授权
const currentAllowance = await pairContract.allowance(
  signerAddress,
  routerAddress
);
console.log("当前LP代币授权:", ethers.formatUnits(currentAllowance, 18));

if (currentAllowance < removeAmount) {
  console.log("需要授权LP代币...");
  addNotification({
    type: "info",
    title: "授权确认",
    message: "需要授权LP代币，请确认交易",
  });

  const approveTx = await pairContract.approve(routerAddress, removeAmount);
  await approveTx.wait();
  console.log("LP代币授权成功");
}
```

### 3. 增强错误处理和调试

```typescript
try {
  console.log("🔄 开始移除流动性...");
  console.log("代币A:", tokenA.symbol, tokenA.address);
  console.log("代币B:", tokenB.symbol, tokenB.address);
  console.log("移除比例:", removePercentage + "%");

  // ... 详细的执行步骤和日志
} catch (error: any) {
  let errorMessage = "移除流动性失败";
  if (error.reason) {
    errorMessage = error.reason;
  } else if (error.message) {
    if (error.message.includes("user rejected")) {
      errorMessage = "用户取消了交易";
    } else if (error.message.includes("insufficient allowance")) {
      errorMessage = "授权不足，请重新授权";
    } else if (error.message.includes("insufficient balance")) {
      errorMessage = "LP代币余额不足";
    } else {
      errorMessage = `交易失败: ${error.message}`;
    }
  }

  addNotification({
    type: "error",
    title: "移除失败",
    message: errorMessage,
  });
}
```

## 修复效果

- ✅ LP 代币授权机制正确实现
- ✅ 详细的错误信息帮助用户识别问题
- ✅ 完整的调试日志便于开发调试
- ✅ 符合 UniswapV2 标准的移除流动性流程

## 移除流动性完整流程图

```mermaid
sequenceDiagram
    participant User as 👤 用户
    participant UI as 🖥️ 流动性界面
    participant Router as 📜 路由器合约
    participant Pair as 💱 交易对合约
    participant TokenA as 🪙 代币A
    participant TokenB as 🪙 代币B

    User->>UI: 1. 选择移除比例
    UI->>Pair: 2. 获取LP代币余额
    Pair-->>UI: 3. 返回余额信息

    User->>UI: 4. 确认移除流动性
    UI->>Pair: 5. 检查LP代币授权
    Pair-->>UI: 6. 返回当前授权额度

    alt 需要授权
        UI->>Pair: 7. approve(Router, amount)
        Pair-->>UI: 8. 授权成功
    end

    UI->>Router: 9. removeLiquidity()
    Router->>Pair: 10. transferFrom(user, pair, lpAmount)
    Router->>Pair: 11. burn(user)

    Pair->>TokenA: 12. transfer(user, amountA)
    Pair->>TokenB: 13. transfer(user, amountB)

    Pair-->>Router: 14. 返回移除数量
    Router-->>UI: 15. 移除成功
    UI-->>User: 16. 显示成功消息

    Note over User,TokenB: LP代币被销毁，用户获得对应的代币A和B
```

## 技术要点

### LP 代币授权机制

LP 代币是 ERC20 代币，需要遵循标准的授权流程：

1. 用户调用`approve`授权路由器使用 LP 代币
2. 路由器调用`transferFrom`转移 LP 代币到交易对
3. 交易对销毁 LP 代币并返还底层资产

### 代币顺序处理

```typescript
// 确定代币顺序并计算最小数量
let amountAMin, amountBMin;
if (token0.toLowerCase() === tokenA.address.toLowerCase()) {
  // tokenA 是 token0
  amountAMin =
    (reserves[0] * removeAmount * BigInt(95)) / (totalSupply * BigInt(100));
  amountBMin =
    (reserves[1] * removeAmount * BigInt(95)) / (totalSupply * BigInt(100));
} else {
  // tokenA 是 token1
  amountAMin =
    (reserves[1] * removeAmount * BigInt(95)) / (totalSupply * BigInt(100));
  amountBMin =
    (reserves[0] * removeAmount * BigInt(95)) / (totalSupply * BigInt(100));
}
```

### 滑点保护

使用 5%滑点保护，确保用户获得最小预期数量的代币：

```typescript
const amountAMin = (expectedAmountA * BigInt(95)) / BigInt(100);
const amountBMin = (expectedAmountB * BigInt(95)) / BigInt(100);
```

# 资金池总览功能新增说明

## 功能描述

新增了**资金池总览**标签页，用户可以查看所有已创建的流动性交易对信息，包括：

- 查看所有活跃的交易对
- 显示每个池的储备量信息
- 查看交换比例和总流动性
- 显示用户在每个池中的 LP 代币持有量
- 计算用户在池中的份额百分比
- 预估可提取的代币价值

## 技术实现

### 1. 新增 PoolsInterface 组件

```typescript
interface PoolInfo {
  token0: TokenInfo;
  token1: TokenInfo;
  pairAddress: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  userLPBalance: string;
  userShare: string; // 用户在池中的份额百分比
}
```

### 2. 自动发现交易对

通过 Factory 合约的`getPair`方法检查所有可能的代币对组合：

```typescript
// 生成所有可能的代币对组合
for (let i = 0; i < importedTokens.length; i++) {
  for (let j = i + 1; j < importedTokens.length; j++) {
    const tokenA = importedTokens[i];
    const tokenB = importedTokens[j];

    const pairAddress = await factoryContract.getPair(
      tokenA.address,
      tokenB.address
    );

    if (pairAddress !== ethers.ZeroAddress) {
      // 发现活跃交易对，获取详细信息
    }
  }
}
```

### 3. 获取详细池信息

对每个发现的交易对，获取：

- 储备量信息（`getReserves()`）
- LP 代币总供应量（`totalSupply()`）
- 用户 LP 代币余额（`balanceOf()`）
- 代币排序（`token0()`, `token1()`）

### 4. 计算用户份额

```typescript
// 计算用户在池中的份额百分比
const userShare =
  totalSupply > 0
    ? ((userLPBalance * BigInt(10000)) / totalSupply).toString()
    : "0";

// 转换为百分比
const sharePercentage = (parseInt(userShare) / 100).toFixed(2);
```

## 用户界面功能

### 主要显示信息

1. **交易对概览**

   - 代币对名称（如 USDT-ETH）
   - 交易对合约地址
   - 交易对编号

2. **流动性信息**

   - 两种代币的储备量
   - 当前交换比例
   - LP 代币总供应量
   - 总价值锁定（TVL）

3. **用户持仓信息**
   - 用户的 LP 代币数量
   - 在池中的份额百分比
   - 可提取的代币价值估算

### 交互功能

- **实时刷新**：手动刷新按钮更新所有池信息
- **自动加载**：连接钱包或代币变化时自动重新加载
- **状态指示**：显示检查进度和发现的交易对数量

## 用户体验优化

### 空状态处理

- 未连接钱包：引导用户连接钱包
- 代币不足：提示需要至少 2 个代币
- 无交易对：提示用户先创建流动性

### 数据展示

- 使用卡片布局清晰展示每个池
- 数字格式化显示（千分位分隔符）
- 颜色区分不同状态（有持仓/无持仓）
- 响应式设计适配不同屏幕

### 统计信息

页面底部显示汇总统计：

- 总交易对数量
- 用户持仓池数量
- 总 LP 代币数量
- 数据来源说明

## 资金池功能流程图

```mermaid
sequenceDiagram
    participant User as 👤 用户
    participant UI as 🖥️ 资金池界面
    participant Factory as 🏭 Factory合约
    participant Pair as 💱 交易对合约
    participant Display as 📊 数据展示

    User->>UI: 1. 访问资金池页面
    UI->>Factory: 2. 检查所有代币对组合

    loop 遍历所有代币对
        Factory-->>UI: 3. 返回交易对地址

        alt 交易对存在
            UI->>Pair: 4. 获取储备量信息
            UI->>Pair: 5. 获取LP代币信息
            UI->>Pair: 6. 获取用户余额
            Pair-->>UI: 7. 返回池详细信息
        end
    end

    UI->>Display: 8. 整理和格式化数据
    Display-->>User: 9. 展示资金池总览

    User->>UI: 10. 点击刷新
    UI->>UI: 11. 重新执行步骤2-9

    Note over User,Display: 实时显示所有活跃交易对信息
```

## 数据流架构

```mermaid
graph TD
    A[已导入代币列表] --> B[生成代币对组合]
    B --> C[Factory.getPair查询]
    C --> D{交易对存在?}

    D -->|是| E[获取Pair合约实例]
    D -->|否| F[跳过此组合]

    E --> G[获取储备量]
    E --> H[获取LP供应量]
    E --> I[获取用户余额]

    G --> J[计算交换比例]
    H --> K[计算用户份额]
    I --> K

    J --> L[格式化显示数据]
    K --> L

    L --> M[渲染池信息卡片]
    F --> N[继续下一个组合]

    M --> O[用户界面显示]

    style A fill:#e1f5fe
    style O fill:#c8e6c9
    style D fill:#fff3e0
```

## 技术优势

1. **自动发现**：无需手动配置，自动发现所有可能的交易对
2. **实时数据**：直接从区块链获取最新信息
3. **用户友好**：清晰的界面布局和状态提示
4. **性能优化**：批量查询减少网络请求
5. **错误处理**：完善的异常处理和用户提示

## 扩展可能

未来可以基于此功能扩展：

- 添加 APY 计算和显示
- 加入 24 小时交易量统计
- 支持价格图表显示
- 添加池的历史数据分析
- 集成价格预警功能

这个资金池功能为用户提供了完整的流动性管理视图，是 DeFi 应用的重要组成部分。
