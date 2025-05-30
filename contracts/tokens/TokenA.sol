// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenA is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10 ** 18; // 1,000,000 tokens
    uint256 public constant FAUCET_AMOUNT = 10000 * 10 ** 18; // 10,000 tokens per request

    constructor() ERC20("Token A", "TKA") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    // 简化的faucet函数，用于测试
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    // 允许Owner空投代币
    function airdrop(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    // 允许Owner铸造额外代币
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // 获取合约信息
    function getTokenInfo()
        external
        view
        returns (
            string memory tokenName,
            string memory tokenSymbol,
            uint8 tokenDecimals,
            uint256 tokenTotalSupply,
            uint256 faucetAmount
        )
    {
        return ("Token A", "TKA", 18, totalSupply(), FAUCET_AMOUNT);
    }
}
