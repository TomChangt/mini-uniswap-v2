import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { ethers } from "ethers";
import addresses from "../contracts/addresses.json";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (event: string) => void;
    };
  }
}

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function faucet() external",
  "function mint(address to, uint256 amount) external",
  "function owner() view returns (address)",
  "function airdropSingle(address recipient, uint256 amount) external",
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address)",
  "function createPair(address tokenA, address tokenB) returns (address)",
  "function feeTo() view returns (address)",
  "function feeToSetter() view returns (address)",
];

const ROUTER_ABI = [
  "function factory() view returns (address)",
  "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)",
];

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  factoryContract: ethers.Contract | null;
  routerContract: ethers.Contract | null;
  getBalance: (address: string) => Promise<string>;
  switchToAvalanche: () => Promise<void>;
  // 新的代币管理方法
  getTokenContract: (address: string) => ethers.Contract | null;
  getTokenBalance: (
    tokenAddress: string,
    userAddress?: string
  ) => Promise<string>;
  refreshTokenBalance: (tokenAddress: string) => Promise<void>;
  refreshAllTokenBalances: () => Promise<void>;
  tokenBalances: { [address: string]: string };
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [factoryContract, setFactoryContract] =
    useState<ethers.Contract | null>(null);
  const [routerContract, setRouterContract] = useState<ethers.Contract | null>(
    null
  );
  const [tokenBalances, setTokenBalances] = useState<{
    [address: string]: string;
  }>({});
  const [tokenContracts, setTokenContracts] = useState<{
    [address: string]: ethers.Contract;
  }>({});

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const network = await provider.getNetwork();

        setProvider(provider);
        setSigner(signer);
        setAccount(accounts[0]);
        setChainId(Number(network.chainId));
        setIsConnected(true);

        // 初始化工厂和路由器合约
        if (addresses.factory) {
          setFactoryContract(
            new ethers.Contract(addresses.factory, FACTORY_ABI, signer)
          );
        }
        if (addresses.router) {
          setRouterContract(
            new ethers.Contract(addresses.router, ROUTER_ABI, signer)
          );
        }

        // 初始化所有代币合约
        const contracts: { [address: string]: ethers.Contract } = {};
        Object.values(addresses.tokens).forEach((tokenAddress) => {
          contracts[tokenAddress] = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            signer
          );
        });
        setTokenContracts(contracts);

        localStorage.setItem("walletConnected", "true");
      } else {
        alert("请安装 MetaMask!");
      }
    } catch (error) {
      console.error("连接钱包失败:", error);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setFactoryContract(null);
    setRouterContract(null);
    setTokenContracts({});
    setTokenBalances({});
    localStorage.removeItem("walletConnected");
  };

  const getBalance = async (address: string): Promise<string> => {
    if (!provider) {
      console.warn("Provider not available");
      return "0";
    }
    try {
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("获取余额失败:", error);
      return "0";
    }
  };

  const getTokenContract = useCallback(
    (address: string): ethers.Contract | null => {
      if (!signer) return null;

      if (tokenContracts[address]) {
        return tokenContracts[address];
      }

      // 动态创建新的代币合约实例
      const contract = new ethers.Contract(address, ERC20_ABI, signer);
      setTokenContracts((prev) => ({ ...prev, [address]: contract }));
      return contract;
    },
    [signer, tokenContracts]
  );

  const getTokenBalance = useCallback(
    async (tokenAddress: string, userAddress?: string): Promise<string> => {
      const targetAddress = userAddress || account;
      if (!targetAddress || !signer) return "0";

      try {
        // 直接创建合约实例避免依赖循环
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const balance = await contract.balanceOf(targetAddress);
        const decimals = await contract.decimals();
        const formattedBalance = ethers.formatUnits(balance, decimals);

        // 更新余额缓存
        setTokenBalances((prev) => ({
          ...prev,
          [tokenAddress]: formattedBalance,
        }));

        return formattedBalance;
      } catch (error) {
        console.error(`获取代币 ${tokenAddress} 余额失败:`, error);
        return "0";
      }
    },
    [account, signer]
  );

  const refreshTokenBalance = async (tokenAddress: string): Promise<void> => {
    await getTokenBalance(tokenAddress);
  };

  const switchToAvalanche = async () => {
    if (!window.ethereum) return;

    // Avalanche L1 本地网络配置
    const avalancheL1Config = {
      chainId: "0x30000B1A", // 202505261834 转换为十六进制
      chainName: "Avalanche L1 Local",
      nativeCurrency: {
        name: "AVX",
        symbol: "AVX",
        decimals: 18,
      },
      rpcUrls: [
        "http://127.0.0.1:49370/ext/bc/oHSfmKP2fJ6YtMjuYkSPDAsB7rosB5LGDnthz82HuM1s1gYBM/rpc",
      ],
      blockExplorerUrls: [""], // 本地网络没有区块链浏览器
    };

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: avalancheL1Config.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [avalancheL1Config],
          });
        } catch (addError) {
          console.error("添加 Avalanche L1 网络失败:", addError);
        }
      }
    }
  };

  // 自动刷新所有代币余额
  const refreshAllTokenBalances = useCallback(async () => {
    if (!account) return;

    const promises = Object.values(addresses.tokens).map((tokenAddress) =>
      getTokenBalance(tokenAddress)
    );

    await Promise.all(promises);
  }, [account, getTokenBalance]);

  useEffect(() => {
    refreshAllTokenBalances();
  }, [account, refreshAllTokenBalances]);

  useEffect(() => {
    const checkConnection = async () => {
      if (
        typeof window.ethereum !== "undefined" &&
        localStorage.getItem("walletConnected")
      ) {
        await connectWallet();
      }
    };

    checkConnection();

    // 监听账户变化
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          await connectWallet();
        }
      });

      window.ethereum.on("chainChanged", (chainId: string) => {
        setChainId(parseInt(chainId, 16));
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      }
    };
  }, []);

  const value: Web3ContextType = {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    connectWallet,
    disconnectWallet,
    factoryContract,
    routerContract,
    getBalance,
    switchToAvalanche,
    getTokenContract,
    getTokenBalance,
    refreshTokenBalance,
    refreshAllTokenBalances,
    tokenBalances,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
