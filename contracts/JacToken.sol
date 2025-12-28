// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title JacToken
 * @dev ERC20 代币，支持 EIP-2612 Permit 功能
 * 允许用户通过链下签名授权其他地址使用代币，无需发送 approve 交易
 */
contract JacToken is ERC20Permit {
    /**
     * @dev 构造函数
     * 铸造 1000 万个代币给部署者
     */
    constructor() ERC20("Jac Token", "JAC") ERC20Permit("Jac Token") {
        _mint(msg.sender, 10_000_000 * 10 ** 18);
    }
}
