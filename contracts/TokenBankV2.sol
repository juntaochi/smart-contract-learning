// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TokenBank.sol";
import "./ITokenReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

/**
 * @dev TokenBankV2 - 支持多种存款方式的代币银行
 * 继承 TokenBank 的基本功能，并实现 ITokenReceiver 接口
 * 支持三种存款方式：
 * 1. 传统方式：approve + deposit
 * 2. 回调方式：transferWithCallback
 * 3. Permit 方式：链下签名 + permitDeposit (EIP-2612)
 */
contract TokenBankV2 is TokenBank, ITokenReceiver {
    constructor(address _token) TokenBank(_token) {}

    /**
     * @dev 实现 ITokenReceiver 接口的回调函数
     * @param from 代币发送者（存款人）
     * @param amount 存入的代币数量
     * @return 返回 true 表示成功接收
     *
     * 当用户调用 token.transferWithCallback(address(this), amount) 时会触发此函数
     */
    function tokensReceived(
        address from,
        uint256 amount
    ) external override returns (bool) {
        // 安全检查：只接受指定的代币合约的回调
        require(
            msg.sender == address(token),
            "TokenBankV2: caller is not the token contract"
        );
        require(amount > 0, "TokenBankV2: amount must be greater than 0");

        // 更新存款记录
        deposits[from] += amount;

        // 触发存款事件
        emit Deposit(from, amount);

        return true;
    }

    /**
     * @dev 通过 Permit 签名存款 (EIP-2612)
     * 用户通过链下签名授权 TokenBank 使用代币，然后在一笔交易中完成授权和存款
     * @param amount 存入的代币数量
     * @param deadline 签名过期时间
     * @param v 签名参数 v
     * @param r 签名参数 r
     * @param s 签名参数 s
     *
     * 好处：相比传统的 approve + deposit（两笔交易），只需一笔交易，节省 gas
     */
    function permitDeposit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(amount > 0, "TokenBankV2: amount must be greater than 0");
        // 调用代币合约的 permit 函数进行授权
        IERC20Permit(address(token)).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        // 从用户地址转移代币到 TokenBank
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "TokenBankV2: transfer failed");

        // 更新用户的存款记录
        deposits[msg.sender] += amount;

        // 触发存款事件
        emit Deposit(msg.sender, amount);
    }
}
