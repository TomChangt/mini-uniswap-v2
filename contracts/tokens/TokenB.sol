// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenB is ERC20, Ownable {
    constructor() ERC20("Token B", "TKB") Ownable(msg.sender) {
        // 初始供应量: 1,000,000 TKB
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function faucet() public {
        // 水龙头功能: 每次可以获得 1000 TKB (开发环境无限制)
        _mint(msg.sender, 1000 * 10 ** decimals());
    }
}
