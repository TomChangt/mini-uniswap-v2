export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
}

export class TokenStorage {
  private static readonly STORAGE_KEY = "mini-uniswap-imported-tokens";

  /**
   * 保存代币列表到本地存储
   */
  static saveTokens(tokens: TokenInfo[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error("保存代币到本地存储失败:", error);
    }
  }

  /**
   * 从本地存储读取代币列表
   */
  static loadTokens(): TokenInfo[] {
    try {
      const savedTokens = localStorage.getItem(this.STORAGE_KEY);
      if (savedTokens) {
        return JSON.parse(savedTokens) as TokenInfo[];
      }
    } catch (error) {
      console.error("从本地存储读取代币失败:", error);
    }
    return [];
  }

  /**
   * 添加新代币到本地存储
   */
  static addToken(token: TokenInfo): TokenInfo[] {
    const existingTokens = this.loadTokens();
    const exists = existingTokens.find(
      (t) => t.address.toLowerCase() === token.address.toLowerCase()
    );

    if (!exists) {
      const newTokens = [...existingTokens, token];
      this.saveTokens(newTokens);
      return newTokens;
    }

    return existingTokens;
  }

  /**
   * 从本地存储删除代币
   */
  static removeToken(tokenAddress: string): TokenInfo[] {
    const existingTokens = this.loadTokens();
    const newTokens = existingTokens.filter(
      (token) => token.address.toLowerCase() !== tokenAddress.toLowerCase()
    );
    this.saveTokens(newTokens);
    return newTokens;
  }

  /**
   * 清空所有代币
   */
  static clearAllTokens(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("清空代币存储失败:", error);
    }
  }

  /**
   * 检查代币是否已存在
   */
  static isTokenExists(tokenAddress: string): boolean {
    const existingTokens = this.loadTokens();
    return existingTokens.some(
      (token) => token.address.toLowerCase() === tokenAddress.toLowerCase()
    );
  }

  /**
   * 获取存储信息
   */
  static getStorageInfo(): {
    count: number;
    size: string;
    lastUpdated: string | null;
  } {
    const tokens = this.loadTokens();
    const storageData = localStorage.getItem(this.STORAGE_KEY);
    const size = storageData
      ? (new Blob([storageData]).size / 1024).toFixed(2) + " KB"
      : "0 KB";

    try {
      const lastUpdated = localStorage.getItem(this.STORAGE_KEY + "_timestamp");
      return {
        count: tokens.length,
        size,
        lastUpdated: lastUpdated
          ? new Date(lastUpdated).toLocaleString()
          : null,
      };
    } catch {
      return {
        count: tokens.length,
        size,
        lastUpdated: null,
      };
    }
  }

  /**
   * 更新时间戳
   */
  static updateTimestamp(): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEY + "_timestamp",
        Date.now().toString()
      );
    } catch (error) {
      console.error("更新时间戳失败:", error);
    }
  }

  /**
   * 导出代币数据
   */
  static exportTokens(): string {
    const tokens = this.loadTokens();
    return JSON.stringify(tokens, null, 2);
  }

  /**
   * 导入代币数据
   */
  static importTokens(tokensJson: string): boolean {
    try {
      const tokens = JSON.parse(tokensJson) as TokenInfo[];
      if (Array.isArray(tokens)) {
        this.saveTokens(tokens);
        this.updateTimestamp();
        return true;
      }
    } catch (error) {
      console.error("导入代币数据失败:", error);
    }
    return false;
  }
}
