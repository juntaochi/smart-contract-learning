// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev 代币接收者接口
 * 合约如果要接收带回调的代币转账，需要实现此接口
 */
interface ITokenReceiver {
    /**
     * @dev 当合约接收到代币时被调用
     * @param from 代币发送者地址
     * @param amount 接收的代币数量
     * @return 返回 true 表示成功接收
     */
    function tokensReceived(address from, uint256 amount) external returns (bool);
}
