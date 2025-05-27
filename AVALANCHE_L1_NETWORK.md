# Avalanche 本地节点部署 Mini Uniswap V2 项目操作手册

### 1.使用 Avalanche-CLI 创建 Avalanche L1

#### 安装 Avalanche-CLI

安装最新 Avalanche-CLI 二进制文件的最快方法是运行安装脚本：

```bash
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh
```

二进制文件安装在~/bin 目录中。如果该目录不存在，则会创建该目录。
同时需要配置环境变量才能使用 avalanche 这个命令，我使用的是 zsh，所以我执行了以下命令：

```bash
echo 'export PATH=~/bin:$PATH' >> ~/.zsh
source ~/.zsh
```

#### 创建 Avalanche L1 配置

##### 使用 avalanche 命令创建配置：配置名称叫 avxL1

```bash
avalanche blockchain create avxL1
```

##### 选择虚拟机：Subnet-EVM

```bash
? Which Virtual Machine would you like to use?:
  ▸ Subnet-EVM
    Custom VM
    Explain the difference
```

##### 选择验证器管理器：Proof Of Authority

```bash
? Which validator management type would you like to use in your blockchain?:
  ▸ Proof Of Authority
    Proof Of Stake
    Explain the difference
```

##### 选择 Get address from an existing stored key：ewoq

```bash
? Which stored key should be used enable as controller of ValidatorManager contract?:
  ▸ ewoq
    cli-awm-relayer
    cli-teleporter-deployer
```

##### 选择区块链配置：I want to use defaults for a test environment

```
? Do you want to use default values for the Blockchain configuration?:
  ▸ I want to use defaults for a test environment
    I want to use defaults for a production environment
    I don't want to use default values
    Explain the difference
```

##### 输入 ChainID：202505261834

```bash
✗ Chain ID: 202505261834
```

##### 输入代币符号：avx

```bash
✗ Token Symbol: avx
```

##### 最后

一切顺利会显示：

```bash
✓ Successfully created blockchain configuration
```

### 2.在本地部署 Avalanche L1

##### 要部署本地 Avalanche L1，直接运行：

```bash
avalanche blockchain deploy avxL1 --local
```

##### 该命令可能需要几分钟才能运行。如果一切按预期工作，命令输出应如下所示：

![01](/assets/01.png)
![02](/assets/02.png)

部署好后有几个参数必须记录下来，后续配置需要用到。

![04](/assets/04.png)
![03](/assets/03.png)
