// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TokenBank.sol";
import "./ITokenReceiver.sol";

/**
 * @dev TokenBankV2 - 支持通过回调函数直接存款的代币银行
 * 继承 TokenBank 的基本功能，并实现 ITokenReceiver 接口
 * 用户可以使用 transferWithCallback 直接存款，无需先 approve
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
    function tokensReceived(address from, uint256 amount) external override returns (bool) {
        // 安全检查：只接受指定的代币合约的回调
        require(msg.sender == address(token), "TokenBankV2: caller is not the token contract");
        require(amount > 0, "TokenBankV2: amount must be greater than 0");
        
        // 更新存款记录
        deposits[from] += amount;
        
        // 触发存款事件
        emit Deposit(from, amount);
        
        return true;
    }
}
