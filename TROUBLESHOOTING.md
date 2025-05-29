# 故障排除指南 - 代币导入问题

## 问题诊断清单

### 1. 检查网络连接 🌐

**症状**: 导入代币时提示网络错误或连接失败

**解决方案**:

```bash
# 1. 确保 Hardhat 本地网络正在运行
npx hardhat node

# 2. 在新终端重新部署合约
npx hardhat run scripts/deploy.ts --network localhost
```

**MetaMask 网络配置**:

- 网络名称: `Localhost 8545`
- RPC URL: `http://localhost:8545`
- Chain ID: `31337`
- 货币符号: `ETH`

### 2. 检查合约地址 📄

**症状**: 提示"合约不存在"或"无效地址"

**当前部署的合约地址**:

```json
{
  "USDT": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  "ETH": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  "AVALANCHE": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  "SOLANA": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
}
```

**验证步骤**:

1. 复制上述地址到导入框
2. 点击"导入代币"按钮
3. 检查是否显示代币信息

### 3. 检查钱包连接 👛

**症状**: 提示"请先连接钱包"

**解决方案**:

1. 确保 MetaMask 已安装
2. 点击右上角"连接钱包"按钮
3. 在 MetaMask 中确认连接
4. 确保选择了正确的账户

### 4. 检查账户余额 💰

**症状**: 代币余额显示为 0

**说明**:

- 默认部署时，所有代币都铸造给特定账户: `0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC`
- 如果你的账户是其他地址，余额会显示为 0
- 这是正常现象，可以使用空投功能获取代币

### 5. 常见错误信息解决

#### "合约不支持 ERC20 标准"

- **原因**: 输入的地址不是有效的 ERC20 合约
- **解决**: 使用上面提供的正确合约地址

#### "网络请求失败"

- **原因**: 本地网络未启动或 RPC 连接问题
- **解决**: 重启本地网络并检查 MetaMask 网络配置

#### "用户拒绝请求"

- **原因**: 在 MetaMask 中点击了"拒绝"
- **解决**: 重新执行操作并在 MetaMask 中点击"确认"

#### "估算 Gas 失败"

- **原因**: 合约调用参数错误或网络问题
- **解决**: 检查网络连接和合约地址

### 6. 完整重置流程 🔄

如果问题仍然存在，按以下步骤完整重置:

```bash
# 1. 停止所有运行中的进程 (Ctrl+C)

# 2. 重新启动本地网络
npx hardhat node

# 3. 新终端重新部署合约
npx hardhat run scripts/deploy.ts --network localhost

# 4. 重新启动前端
cd frontend && npm start

# 5. 刷新浏览器页面
# 6. 重新连接 MetaMask
```

### 7. 调试技巧 🔍

**打开浏览器开发者工具**:

1. 按 F12 打开开发者工具
2. 查看 Console 标签页的错误信息
3. 查看 Network 标签页的网络请求

**常见 Console 错误**:

- `Provider not found`: MetaMask 未安装或未启用
- `Network Error`: 网络连接问题
- `Contract call failed`: 合约调用失败

### 8. 验证导入是否成功 ✅

**成功导入的标志**:

1. 左侧"已导入代币"列表中显示新代币
2. 显示代币名称、符号和余额
3. 绿色成功提示消息

**测试导入功能**:

1. 使用 USDT 地址: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
2. 点击导入，应该显示:
   - 名称: Tether USD
   - 符号: USDT
   - 余额: 取决于当前账户

### 9. 获取测试代币 🎁

如果余额为 0，可以使用空投功能:

1. 切换到"空投"标签页
2. 选择要获取的代币
3. 输入你的钱包地址
4. 输入数量（如 100）
5. 确认交易

**注意**: 空投功能需要代币所有者权限，确保使用正确的账户。

### 10. 联系支持 📞

如果以上方法都无法解决问题:

1. 记录完整的错误信息
2. 截图显示问题界面
3. 提供当前使用的账户地址
4. 说明执行的具体步骤

---

## 快速测试清单

- [ ] Hardhat 本地网络正在运行
- [ ] 合约已成功部署
- [ ] MetaMask 已连接到本地网络 (localhost:8545)
- [ ] 使用正确的代币合约地址
- [ ] 浏览器开发者工具无错误信息
- [ ] 前端应用正常加载

完成以上清单后，代币导入功能应该正常工作。

# 故障排除指南 - Avalanche L1 网络部署

## 📋 Avalanche L1 网络配置

**合约已部署到 Avalanche L1 本地网络**

### MetaMask 网络配置 🌐

请在 MetaMask 中添加以下网络配置：

- **网络名称**: `Avalanche L1 Local`
- **RPC URL**: `http://127.0.0.1:49370/ext/bc/oHSfmKP2fJ6YtMjuYkSPDAsB7rosB5LGDnthz82HuM1s1gYBM/rpc`
- **Chain ID**: `202505261834`
- **货币符号**: `AVX`
- **区块链浏览器**: 留空（本地网络）

### 当前部署的合约地址 📄

```json
{
  "factory": "0xa4DfF80B4a1D748BF28BC4A271eD834689Ea3407",
  "router": "0xe336d36FacA76840407e6836d26119E1EcE0A2b4",
  "tokens": {
    "USDT": "0x95CA0a568236fC7413Cd2b794A7da24422c2BBb6",
    "ETH": "0x789a5FDac2b37FCD290fb2924382297A6AE65860",
    "AVALANCHE": "0xE3573540ab8A1C4c754Fd958Dc1db39BBE81b208",
    "SOLANA": "0x8B3BC4270BE2abbB25BC04717830bd1Cc493a461"
  }
}
```

## 问题诊断清单

### 1. 确保 Avalanche L1 节点运行 🔥

**症状**: 导入代币时提示网络错误或连接失败

**解决方案**:

```bash
# 1. 确保 Avalanche L1 节点正在运行
avalanche blockchain deploy avxL1 --local

# 2. 如果需要重新部署合约
npx hardhat run scripts/deploy.ts --network avalanche
```

### 2. 网络连接检查 ✅

**验证步骤**:

1. 确保 Avalanche L1 节点在 `http://127.0.0.1:49370` 运行
2. 在 MetaMask 中切换到 "Avalanche L1 Local" 网络
3. 检查 Chain ID 是否为 `202505261834`

### 3. 测试代币导入 🪙

**推荐测试顺序**:

1. 使用 USDT 地址: `0x95CA0a568236fC7413Cd2b794A7da24422c2BBb6`
2. 使用 ETH 地址: `0x789a5FDac2b37FCD290fb2924382297A6AE65860`
3. 使用 AVALANCHE 地址: `0xE3573540ab8A1C4c754Fd958Dc1db39BBE81b208`
4. 使用 SOLANA 地址: `0x8B3BC4270BE2abbB25BC04717830bd1Cc493a461`

### 4. 账户和余额 💰

**重要信息**:

- 所有代币的所有者是: `0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC`
- 该账户已铸造 1,000,000 个代币
- 其他账户余额为 0（可通过空投获取）

**如何导入所有者账户到 MetaMask**:

1. 在 MetaMask 中点击"导入账户"
2. 选择"私钥"
3. 输入私钥: `0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027`
4. 点击"导入"

### 5. 常见错误解决

#### "网络请求失败"

- **原因**: Avalanche L1 节点未运行
- **解决**: 运行 `avalanche blockchain deploy avxL1 --local`

#### "合约不存在"

- **原因**: 使用了错误的合约地址或网络
- **解决**: 使用上面提供的正确合约地址

#### "Chain ID 不匹配"

- **原因**: MetaMask 连接到错误的网络
- **解决**: 在应用中点击"切换网络"按钮

### 6. 快速重置流程 🔄

如果遇到问题，按以下步骤重置：

```bash
# 1. 停止当前 Avalanche L1 节点
# Ctrl+C 停止

# 2. 重新启动 Avalanche L1 节点
avalanche blockchain deploy avxL1 --local

# 3. 重新部署合约（新终端）
npx hardhat run scripts/deploy.ts --network avalanche

# 4. 重新启动前端
cd frontend && npm start

# 5. 在 MetaMask 中切换到 Avalanche L1 网络
# 6. 刷新浏览器页面
```

### 7. 验证部署成功 ✅

**成功标志**:

1. 网络状态显示 ✅ "已连接到正确网络"
2. 能够成功导入代币并显示信息
3. 左侧列表显示导入的代币和余额

**快速测试**:

```
1. 访问 http://localhost:3000
2. 连接钱包到 Avalanche L1 网络
3. 导入 USDT: 0x95CA0a568236fC7413Cd2b794A7da24422c2BBb6
4. 应该显示: 名称="Tether USD", 符号="USDT"
```

---

## 🚀 Avalanche L1 部署完成

✅ **智能合约已成功部署到 Avalanche L1 网络**
✅ **前端已配置连接到 Avalanche L1**
✅ **支持自动网络检测和切换**

现在你可以使用完整的多代币 DEX 功能了！
