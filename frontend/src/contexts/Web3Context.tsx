import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import addresses from "../contracts/addresses.json";

// 合约 ABI（简化版本，实际使用时需要完整的 ABI）
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function faucet()",
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address)",
  "function createPair(address tokenA, address tokenB) returns (address)",
  "function allPairsLength() view returns (uint256)",
];

const ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)",
  "function getAmountsIn(uint amountOut, address[] path) view returns (uint[] amounts)",
];

// PAIR_ABI 在其他组件中会用到，保留备用
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  tokenAContract: ethers.Contract | null;
  tokenBContract: ethers.Contract | null;
  factoryContract: ethers.Contract | null;
  routerContract: ethers.Contract | null;
  getBalance: (address: string) => Promise<string>;
  switchToAvalanche: () => Promise<void>;
  // 新增：统一的代币余额管理
  tokenABalance: string;
  tokenBBalance: string;
  refreshTokenBalances: () => Promise<void>;
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
  const [tokenAContract, setTokenAContract] = useState<ethers.Contract | null>(
    null
  );
  const [tokenBContract, setTokenBContract] = useState<ethers.Contract | null>(
    null
  );
  const [factoryContract, setFactoryContract] =
    useState<ethers.Contract | null>(null);
  const [routerContract, setRouterContract] = useState<ethers.Contract | null>(
    null
  );
  // 新增：统一的代币余额状态
  const [tokenABalance, setTokenABalance] = useState<string>("0");
  const [tokenBBalance, setTokenBBalance] = useState<string>("0");

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const network = await provider.getNetwork();

        setProvider(provider);
        setSigner(signer);
        setAccount(accounts[0]);
        setChainId(Number(network.chainId));
        setIsConnected(true);

        // 初始化合约实例
        if (addresses.tokenA) {
          setTokenAContract(
            new ethers.Contract(addresses.tokenA, ERC20_ABI, signer)
          );
        }
        if (addresses.tokenB) {
          setTokenBContract(
            new ethers.Contract(addresses.tokenB, ERC20_ABI, signer)
          );
        }
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
    setTokenAContract(null);
    setTokenBContract(null);
    setFactoryContract(null);
    setRouterContract(null);
    localStorage.removeItem("walletConnected");
  };

  const getBalance = async (address: string): Promise<string> => {
    if (!provider) {
      console.warn("Provider not available");
      return "0";
    }
    try {
      console.log("Getting balance for address:", address);
      const balance = await provider.getBalance(address);
      console.log("Raw balance:", balance.toString());
      const formattedBalance = ethers.formatEther(balance);
      console.log("Formatted balance:", formattedBalance);
      return formattedBalance;
    } catch (error) {
      console.error("获取余额失败:", error);
      return "0";
    }
  };

  const switchToAvalanche = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xA86A" }], // Avalanche Mainnet
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xA86A",
                chainName: "Avalanche Network",
                nativeCurrency: {
                  name: "AVAX",
                  symbol: "AVAX",
                  decimals: 18,
                },
                rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
                blockExplorerUrls: ["https://snowtrace.io/"],
              },
            ],
          });
        } catch (addError) {
          console.error("添加网络失败:", addError);
        }
      }
    }
  };

  // 新增：刷新代币余额的函数
  const refreshTokenBalances = useCallback(async () => {
    if (!account || !tokenAContract || !tokenBContract) {
      setTokenABalance("0");
      setTokenBBalance("0");
      return;
    }

    try {
      const [balA, balB] = await Promise.all([
        tokenAContract.balanceOf(account),
        tokenBContract.balanceOf(account),
      ]);

      setTokenABalance(ethers.formatEther(balA));
      setTokenBBalance(ethers.formatEther(balB));
    } catch (error) {
      console.error("刷新代币余额失败:", error);
    }
  }, [account, tokenAContract, tokenBContract]);

  // 自动刷新代币余额
  useEffect(() => {
    refreshTokenBalances();
  }, [account, tokenAContract, tokenBContract, refreshTokenBalances]);

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
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      });

      window.ethereum.on("chainChanged", (chainId: string) => {
        setChainId(parseInt(chainId, 16));
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
    tokenAContract,
    tokenBContract,
    factoryContract,
    routerContract,
    getBalance,
    switchToAvalanche,
    tokenABalance,
    tokenBBalance,
    refreshTokenBalances,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
