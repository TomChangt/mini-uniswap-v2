import { ethers } from "ethers";
import { TokenInfo } from "./tokenStorage";

export interface SwapPath {
  path: string[];
  tokens: TokenInfo[];
  expectedOutput: string;
  priceImpact: number;
  gasEstimate?: number;
}

export interface PathFinderOptions {
  maxHops: number;
  maxPaths: number;
  slippageTolerance: number;
}

export class PathFinder {
  private factoryContract: ethers.Contract;
  private routerContract: ethers.Contract;
  private tokens: TokenInfo[];

  constructor(
    factoryContract: ethers.Contract,
    routerContract: ethers.Contract,
    tokens: TokenInfo[]
  ) {
    this.factoryContract = factoryContract;
    this.routerContract = routerContract;
    this.tokens = tokens;
  }

  /**
   * 查找所有可能的交换路径
   */
  async findAllPaths(
    fromToken: TokenInfo,
    toToken: TokenInfo,
    amountIn: string,
    options: PathFinderOptions = {
      maxHops: 3,
      maxPaths: 5,
      slippageTolerance: 0.5,
    }
  ): Promise<SwapPath[]> {
    const validPaths: SwapPath[] = [];

    try {
      // 1. 直接路径 (A -> B)
      console.log(`🔍 检查直接路径: ${fromToken.symbol} -> ${toToken.symbol}`);
      const directPath = await this.calculateDirectPath(
        fromToken,
        toToken,
        amountIn
      );
      if (directPath) {
        validPaths.push(directPath);
        console.log(`✅ 找到直接路径，输出: ${directPath.expectedOutput}`);
      }

      // 2. 2跳路径 (A -> C -> B)
      if (options.maxHops >= 2) {
        console.log(`🔍 查找2跳路径...`);
        const twoHopPaths = await this.findTwoHopPaths(
          fromToken,
          toToken,
          amountIn
        );
        validPaths.push(...twoHopPaths);
        console.log(`✅ 找到 ${twoHopPaths.length} 条2跳路径`);
      }

      // 3. 3跳路径 (A -> C -> D -> B)
      if (options.maxHops >= 3) {
        console.log(`🔍 查找3跳路径...`);
        const threeHopPaths = await this.findThreeHopPaths(
          fromToken,
          toToken,
          amountIn
        );
        validPaths.push(...threeHopPaths);
        console.log(`✅ 找到 ${threeHopPaths.length} 条3跳路径`);
      }

      // 4. 按预期输出排序，返回最优路径
      const sortedPaths = validPaths
        .filter((path) => path && parseFloat(path.expectedOutput) > 0)
        .sort(
          (a, b) => parseFloat(b.expectedOutput) - parseFloat(a.expectedOutput)
        )
        .slice(0, options.maxPaths);

      console.log(`🎯 最终返回 ${sortedPaths.length} 条最优路径`);
      return sortedPaths;
    } catch (error) {
      console.error("路径查找过程中发生错误:", error);
      return validPaths.filter(
        (path) => path && parseFloat(path.expectedOutput) > 0
      );
    }
  }

  /**
   * 计算直接路径 A -> B
   */
  private async calculateDirectPath(
    fromToken: TokenInfo,
    toToken: TokenInfo,
    amountIn: string
  ): Promise<SwapPath | null> {
    try {
      // 检查是否存在直接交易对
      const pairExists = await this.pairExists(
        fromToken.address,
        toToken.address
      );
      if (!pairExists) {
        return null;
      }

      const amountInWei = ethers.parseUnits(amountIn, fromToken.decimals);
      const path = [fromToken.address, toToken.address];

      const amounts = await this.routerContract.getAmountsOut(
        amountInWei,
        path
      );
      const expectedOutput = ethers.formatUnits(amounts[1], toToken.decimals);

      // 计算价格影响
      const priceImpact = await this.calculatePriceImpact(
        fromToken,
        toToken,
        amountIn,
        expectedOutput
      );

      return {
        path,
        tokens: [fromToken, toToken],
        expectedOutput,
        priceImpact,
      };
    } catch (error) {
      console.log(
        `直接路径 ${fromToken.symbol} -> ${toToken.symbol} 不可用:`,
        error
      );
      return null;
    }
  }

  /**
   * 查找2跳路径 A -> C -> B
   */
  private async findTwoHopPaths(
    fromToken: TokenInfo,
    toToken: TokenInfo,
    amountIn: string
  ): Promise<SwapPath[]> {
    const paths: SwapPath[] = [];
    const intermediateTokens = this.getIntermediateTokens(fromToken, toToken);

    for (const intermediate of intermediateTokens) {
      try {
        // 检查 A -> C 和 C -> B 是否都存在
        const firstHopExists = await this.pairExists(
          fromToken.address,
          intermediate.address
        );
        const secondHopExists = await this.pairExists(
          intermediate.address,
          toToken.address
        );

        if (firstHopExists && secondHopExists) {
          const pathTokens = [fromToken, intermediate, toToken];
          const pathResult = await this.calculatePathOutput(
            pathTokens,
            amountIn
          );

          if (pathResult && parseFloat(pathResult.expectedOutput) > 0) {
            paths.push(pathResult);
            console.log(
              `✅ 2跳路径: ${fromToken.symbol} -> ${intermediate.symbol} -> ${toToken.symbol}, 输出: ${pathResult.expectedOutput}`
            );
          }
        }
      } catch (error) {
        console.log(
          `2跳路径计算失败 ${fromToken.symbol} -> ${intermediate.symbol} -> ${toToken.symbol}:`,
          error
        );
      }
    }

    return paths;
  }

  /**
   * 查找3跳路径 A -> C -> D -> B
   */
  private async findThreeHopPaths(
    fromToken: TokenInfo,
    toToken: TokenInfo,
    amountIn: string
  ): Promise<SwapPath[]> {
    const paths: SwapPath[] = [];
    const intermediateTokens = this.getIntermediateTokens(fromToken, toToken);

    for (const intermediate1 of intermediateTokens) {
      for (const intermediate2 of intermediateTokens) {
        // 避免循环：intermediate2 不能等于 intermediate1, fromToken 或 toToken
        if (
          intermediate2.address === intermediate1.address ||
          intermediate2.address === fromToken.address ||
          intermediate2.address === toToken.address
        ) {
          continue;
        }

        try {
          // 检查所有跳跃是否都存在
          const firstHopExists = await this.pairExists(
            fromToken.address,
            intermediate1.address
          );
          const secondHopExists = await this.pairExists(
            intermediate1.address,
            intermediate2.address
          );
          const thirdHopExists = await this.pairExists(
            intermediate2.address,
            toToken.address
          );

          if (firstHopExists && secondHopExists && thirdHopExists) {
            const pathTokens = [
              fromToken,
              intermediate1,
              intermediate2,
              toToken,
            ];
            const pathResult = await this.calculatePathOutput(
              pathTokens,
              amountIn
            );

            if (pathResult && parseFloat(pathResult.expectedOutput) > 0) {
              paths.push(pathResult);
              console.log(
                `✅ 3跳路径: ${fromToken.symbol} -> ${intermediate1.symbol} -> ${intermediate2.symbol} -> ${toToken.symbol}, 输出: ${pathResult.expectedOutput}`
              );
            }
          }
        } catch (error) {
          console.log(`3跳路径计算失败:`, error);
        }
      }
    }

    return paths;
  }

  /**
   * 获取中间代币列表（排除起始和目标代币）
   */
  private getIntermediateTokens(
    fromToken: TokenInfo,
    toToken: TokenInfo
  ): TokenInfo[] {
    return this.tokens.filter(
      (token) =>
        token.address !== fromToken.address && token.address !== toToken.address
    );
  }

  /**
   * 检查交易对是否存在
   */
  private async pairExists(tokenA: string, tokenB: string): Promise<boolean> {
    try {
      const pairAddress = await this.factoryContract.getPair(tokenA, tokenB);
      return pairAddress !== ethers.ZeroAddress;
    } catch {
      return false;
    }
  }

  /**
   * 计算路径的预期输出
   */
  private async calculatePathOutput(
    tokens: TokenInfo[],
    amountIn: string
  ): Promise<SwapPath | null> {
    try {
      const path = tokens.map((token) => token.address);

      // 验证路径不包含循环
      const uniqueAddresses = new Set(path);
      if (uniqueAddresses.size !== path.length) {
        console.log("检测到循环路径，跳过:", path);
        return null;
      }

      const amountInWei = ethers.parseUnits(amountIn, tokens[0].decimals);

      const amounts = await this.routerContract.getAmountsOut(
        amountInWei,
        path
      );
      const lastToken = tokens[tokens.length - 1];
      const expectedOutput = ethers.formatUnits(
        amounts[amounts.length - 1],
        lastToken.decimals
      );

      // 验证输出是否合理
      if (parseFloat(expectedOutput) <= 0) {
        return null;
      }

      // 计算价格影响
      const priceImpact = await this.calculatePriceImpact(
        tokens[0],
        lastToken,
        amountIn,
        expectedOutput
      );

      return {
        path,
        tokens,
        expectedOutput,
        priceImpact,
      };
    } catch (error) {
      console.log("路径计算失败:", error);
      return null;
    }
  }

  /**
   * 计算价格影响
   */
  private async calculatePriceImpact(
    fromToken: TokenInfo,
    toToken: TokenInfo,
    amountIn: string,
    expectedOutput: string
  ): Promise<number> {
    try {
      // 使用小额度计算市场价格
      const smallAmountIn = ethers.parseUnits("1", fromToken.decimals);
      const path = [fromToken.address, toToken.address];

      const smallAmounts = await this.routerContract.getAmountsOut(
        smallAmountIn,
        path
      );
      const marketRate = parseFloat(
        ethers.formatUnits(smallAmounts[1], toToken.decimals)
      );
      const actualRate = parseFloat(expectedOutput) / parseFloat(amountIn);

      const priceImpact =
        Math.abs((marketRate - actualRate) / marketRate) * 100;
      return Math.min(priceImpact, 100); // 限制最大价格影响为100%
    } catch {
      return 0; // 如果无法计算，返回0%
    }
  }

  /**
   * 获取最优路径
   */
  async getBestPath(
    fromToken: TokenInfo,
    toToken: TokenInfo,
    amountIn: string,
    options?: PathFinderOptions
  ): Promise<SwapPath | null> {
    const paths = await this.findAllPaths(
      fromToken,
      toToken,
      amountIn,
      options
    );
    return paths.length > 0 ? paths[0] : null;
  }

  /**
   * 检查路径的流动性充足性
   */
  async checkPathLiquidity(path: SwapPath, amountIn: string): Promise<boolean> {
    try {
      const amountInWei = ethers.parseUnits(amountIn, path.tokens[0].decimals);
      await this.routerContract.getAmountsOut(amountInWei, path.path);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 格式化路径显示
 */
export function formatPathDisplay(path: SwapPath): string {
  return path.tokens.map((token) => token.symbol).join(" → ");
}

/**
 * 计算最小输出金额（考虑滑点）
 */
export function calculateMinOutput(
  expectedOutput: string,
  slippagePercent: number,
  decimals: number
): bigint {
  const outputBN = ethers.parseUnits(expectedOutput, decimals);
  const slippageBN =
    (outputBN * BigInt(Math.floor(slippagePercent * 100))) / BigInt(10000);
  return outputBN - slippageBN;
}
