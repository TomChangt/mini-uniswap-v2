// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../core/UniswapV2Factory.sol";
import "../core/UniswapV2Pair.sol";

contract UniswapV2Router {
    address public immutable factory;

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, "UniswapV2Router: EXPIRED");
        _;
    }

    constructor(address _factory) {
        factory = _factory;
    }

    // 计算两个代币的排序
    function sortTokens(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "UniswapV2Router: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "UniswapV2Router: ZERO_ADDRESS");
    }

    // 获取交易对地址
    function pairFor(
        address tokenA,
        address tokenB
    ) internal view returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = UniswapV2Factory(factory).getPair(token0, token1);
    }

    // 获取储备
    function getReserves(
        address tokenA,
        address tokenB
    ) internal view returns (uint reserveA, uint reserveB) {
        (address token0, ) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1, ) = UniswapV2Pair(
            pairFor(tokenA, tokenB)
        ).getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    // 计算输出数量（给定输入数量）
    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) internal pure returns (uint amountOut) {
        require(amountIn > 0, "UniswapV2Router: INSUFFICIENT_INPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "UniswapV2Router: INSUFFICIENT_LIQUIDITY"
        );

        unchecked {
            uint amountInWithFee = amountIn * 997;
            uint numerator = amountInWithFee * reserveOut;
            uint denominator = reserveIn * 1000 + amountInWithFee;
            amountOut = numerator / denominator;
        }
    }

    // 计算输入数量（给定输出数量）
    function getAmountIn(
        uint amountOut,
        uint reserveIn,
        uint reserveOut
    ) internal pure returns (uint amountIn) {
        require(amountOut > 0, "UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "UniswapV2Router: INSUFFICIENT_LIQUIDITY"
        );
        require(amountOut < reserveOut, "UniswapV2Router: AMOUNT_OUT_TOO_HIGH");

        unchecked {
            uint numerator = reserveIn * amountOut * 1000;
            uint denominator = (reserveOut - amountOut) * 997;
            amountIn = (numerator / denominator) + 1;
        }
    }

    // 获取输出数量（给定输入数量和路径）
    function getAmountsOut(
        uint amountIn,
        address[] memory path
    ) public view returns (uint[] memory amounts) {
        require(path.length >= 2, "UniswapV2Router: INVALID_PATH");
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = getReserves(
                path[i],
                path[i + 1]
            );
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // 获取输入数量（给定输出数量和路径）
    function getAmountsIn(
        uint amountOut,
        address[] memory path
    ) public view returns (uint[] memory amounts) {
        require(path.length >= 2, "UniswapV2Router: INVALID_PATH");
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            (uint reserveIn, uint reserveOut) = getReserves(
                path[i - 1],
                path[i]
            );
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }

    // 安全转账
    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint value
    ) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(
                IERC20.transferFrom.selector,
                from,
                to,
                value
            )
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "UniswapV2Router: TRANSFER_FROM_FAILED"
        );
    }

    // 添加流动性
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    )
        external
        ensure(deadline)
        returns (uint amountA, uint amountB, uint liquidity)
    {
        // 创建交易对（如果不存在）
        if (UniswapV2Factory(factory).getPair(tokenA, tokenB) == address(0)) {
            UniswapV2Factory(factory).createPair(tokenA, tokenB);
        }

        (amountA, amountB) = _addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );
        address pair = pairFor(tokenA, tokenB);
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = UniswapV2Pair(pair).mint(to);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal view returns (uint amountA, uint amountB) {
        (uint reserveA, uint reserveB) = getReserves(tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(
                    amountBOptimal >= amountBMin,
                    "UniswapV2Router: INSUFFICIENT_B_AMOUNT"
                );
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint amountAOptimal = (amountBDesired * reserveA) / reserveB;
                assert(amountAOptimal <= amountADesired);
                require(
                    amountAOptimal >= amountAMin,
                    "UniswapV2Router: INSUFFICIENT_A_AMOUNT"
                );
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    // 移除流动性
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) public ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = pairFor(tokenA, tokenB);
        UniswapV2Pair(pair).transferFrom(msg.sender, pair, liquidity);
        (uint amount0, uint amount1) = UniswapV2Pair(pair).burn(to);
        (address token0, ) = sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);
        require(
            amountA >= amountAMin,
            "UniswapV2Router: INSUFFICIENT_A_AMOUNT"
        );
        require(
            amountB >= amountBMin,
            "UniswapV2Router: INSUFFICIENT_B_AMOUNT"
        );
    }

    // 精确输入交换
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        require(
            amounts[amounts.length - 1] >= amountOutMin,
            "UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT"
        );
        _safeTransferFrom(
            path[0],
            msg.sender,
            pairFor(path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }

    // 精确输出交换
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        amounts = getAmountsIn(amountOut, path);
        require(
            amounts[0] <= amountInMax,
            "UniswapV2Router: EXCESSIVE_INPUT_AMOUNT"
        );
        _safeTransferFrom(
            path[0],
            msg.sender,
            pairFor(path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);
    }

    function _swap(
        uint[] memory amounts,
        address[] memory path,
        address _to
    ) internal {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0
                ? (uint(0), amountOut)
                : (amountOut, uint(0));
            address to = i < path.length - 2
                ? pairFor(output, path[i + 2])
                : _to;
            UniswapV2Pair(pairFor(input, output)).swap(
                amount0Out,
                amount1Out,
                to,
                new bytes(0)
            );
        }
    }
}
