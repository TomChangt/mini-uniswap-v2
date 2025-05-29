// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AVALANCHE is ERC20, Ownable {
    constructor() ERC20("Avalanche", "AVAX") Ownable(msg.sender) {
        // 初始供应量: 1,000,000 AVAX，部署者获得
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function faucet() public {
        // 水龙头功能: 每次可以获得 100 AVAX
        _mint(msg.sender, 100 * 10 ** decimals());
    }

    // 空投功能
    function airdrop(
        address[] calldata recipients,
        uint256 amount
    ) public onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amount);
        }
    }

    // 单个空投
    function airdropSingle(address recipient, uint256 amount) public onlyOwner {
        _transfer(msg.sender, recipient, amount);
    }

    // 获取代币描述
    function description() public pure returns (string memory) {
        return "Simulated Avalanche token for Mini Uniswap V2 DEX";
    }
}
