// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BaseERC20.sol";
import "./ITokenReceiver.sol";

/**
 * @dev 扩展的 ERC20 合约，添加了 transferWithCallback 功能
 * 继承自 BaseERC20，增加了向合约地址转账时的回调机制
 */
contract ERC20WithCallback is BaseERC20 {
    
    /**
     * @dev 带回调功能的转账函数
     * @param to 接收者地址
     * @param amount 转账金额
     * @return success 转账是否成功
     * 
     * 如果目标地址是合约，会调用其 tokensReceived 方法
     */
    function transferWithCallback(address to, uint256 amount) public returns (bool success) {
        // 基本验证
        require(to != address(0), "ERC20: transfer to the zero address");
        require(balances[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");
        
        // 执行转账
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        // 检查目标地址是否为合约
        if (isContract(to)) {
            // 调用目标合约的 tokensReceived 回调函数
            bool received = ITokenReceiver(to).tokensReceived(msg.sender, amount);
            require(received, "ERC20: token receiver rejected tokens");
        }
        
        return true;
    }
    
    /**
     * @dev 检查一个地址是否为合约
     * @param account 要检查的地址
     * @return 如果是合约返回 true，否则返回 false
     */
    function isContract(address account) internal view returns (bool) {
        // 获取地址的代码大小
        // EOA (外部账户) 的代码大小为 0
        // 合约账户的代码大小 > 0
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}
