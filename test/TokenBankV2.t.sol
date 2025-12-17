// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/ERC20WithCallback.sol";
import "../contracts/TokenBankV2.sol";

contract TokenBankV2Test is Test {
    ERC20WithCallback public token;
    TokenBankV2 public tokenBank;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        // 部署 ERC20WithCallback 代币合约
        token = new ERC20WithCallback();
        
        // 部署 TokenBankV2 合约
        tokenBank = new TokenBankV2(address(token));
        
        // 给 user1 和 user2 分配代币
        token.transfer(user1, 1000 * 10**18);
        token.transfer(user2, 1000 * 10**18);
    }
    
    // 测试通过 transferWithCallback 直接存款
    function testDepositViaTransferWithCallback() public {
        uint256 depositAmount = 100 * 10**18;
        
        vm.prank(user1);
        token.transferWithCallback(address(tokenBank), depositAmount);
        
        // 验证存款余额
        assertEq(tokenBank.balanceOf(user1), depositAmount);
        assertEq(token.balanceOf(address(tokenBank)), depositAmount);
        assertEq(token.balanceOf(user1), 900 * 10**18);
    }
    
    // 测试多次通过 transferWithCallback 存款
    function testMultipleDepositsViaCallback() public {
        uint256 amount1 = 100 * 10**18;
        uint256 amount2 = 50 * 10**18;
        
        vm.startPrank(user1);
        token.transferWithCallback(address(tokenBank), amount1);
        token.transferWithCallback(address(tokenBank), amount2);
        vm.stopPrank();
        
        assertEq(tokenBank.balanceOf(user1), amount1 + amount2);
    }
    
    // 测试多个用户通过 callback 存款
    function testMultipleUsersDepositViaCallback() public {
        uint256 amount1 = 100 * 10**18;
        uint256 amount2 = 200 * 10**18;
        
        vm.prank(user1);
        token.transferWithCallback(address(tokenBank), amount1);
        
        vm.prank(user2);
        token.transferWithCallback(address(tokenBank), amount2);
        
        assertEq(tokenBank.balanceOf(user1), amount1);
        assertEq(tokenBank.balanceOf(user2), amount2);
        assertEq(token.balanceOf(address(tokenBank)), amount1 + amount2);
    }
    
    // 测试提取功能仍然有效
    function testWithdrawAfterCallbackDeposit() public {
        uint256 depositAmount = 100 * 10**18;
        uint256 withdrawAmount = 60 * 10**18;
        
        vm.startPrank(user1);
        
        // 通过 callback 存款
        token.transferWithCallback(address(tokenBank), depositAmount);
        
        // 提取
        tokenBank.withdraw(withdrawAmount);
        
        vm.stopPrank();
        
        assertEq(tokenBank.balanceOf(user1), depositAmount - withdrawAmount);
        assertEq(token.balanceOf(user1), 1000 * 10**18 - depositAmount + withdrawAmount);
    }
    
    // 测试旧的 deposit 方法仍然可用
    function testTraditionalDepositStillWorks() public {
        uint256 depositAmount = 100 * 10**18;
        
        vm.startPrank(user1);
        
        token.approve(address(tokenBank), depositAmount);
        tokenBank.deposit(depositAmount);
        
        vm.stopPrank();
        
        assertEq(tokenBank.balanceOf(user1), depositAmount);
    }
    
    // 测试混合使用两种存款方式
    function testMixedDepositMethods() public {
        uint256 callbackAmount = 100 * 10**18;
        uint256 traditionalAmount = 50 * 10**18;
        
        vm.startPrank(user1);
        
        // 通过 callback 存款
        token.transferWithCallback(address(tokenBank), callbackAmount);
        
        // 通过传统方式存款
        token.approve(address(tokenBank), traditionalAmount);
        tokenBank.deposit(traditionalAmount);
        
        vm.stopPrank();
        
        assertEq(tokenBank.balanceOf(user1), callbackAmount + traditionalAmount);
    }
    
    // 测试 Deposit 事件在 callback 时正确触发
    function testDepositEventViaCallback() public {
        uint256 depositAmount = 100 * 10**18;
        
        vm.prank(user1);
        
        // 期望触发 Deposit 事件
        vm.expectEmit(true, false, false, true);
        emit TokenBank.Deposit(user1, depositAmount);
        
        token.transferWithCallback(address(tokenBank), depositAmount);
    }
    
    // 测试只接受指定代币合约的 callback
    function testRejectCallbackFromWrongToken() public {
        // 部署另一个代币合约
        ERC20WithCallback anotherToken = new ERC20WithCallback();
        anotherToken.transfer(user1, 1000 * 10**18);
        
        vm.prank(user1);
        // 应该被拒绝，因为 tokenBank 只接受指定代币的回调
        vm.expectRevert("TokenBankV2: caller is not the token contract");
        anotherToken.transferWithCallback(address(tokenBank), 100 * 10**18);
    }
    
    // 测试直接调用 tokensReceived 会失败
    function testDirectCallToTokensReceivedFails() public {
        vm.prank(user1);
        vm.expectRevert("TokenBankV2: caller is not the token contract");
        tokenBank.tokensReceived(user1, 100 * 10**18);
    }
    
    // 测试通过 callback 存入 0 金额会失败
    function testRevertWhenCallbackWithZeroAmount() public {
        // 我们需要手动调用 tokensReceived，因为 transferWithCallback 会先检查余额
        vm.prank(address(token));
        vm.expectRevert("TokenBankV2: amount must be greater than 0");
        tokenBank.tokensReceived(user1, 0);
    }
    
    // 测试完整流程：callback 存款 -> 提取 -> 再次 callback 存款
    function testFullWorkflow() public {
        uint256 amount = 100 * 10**18;
        
        vm.startPrank(user1);
        
        // 第一次存款
        token.transferWithCallback(address(tokenBank), amount);
        assertEq(tokenBank.balanceOf(user1), amount);
        
        // 提取一半
        tokenBank.withdraw(amount / 2);
        assertEq(tokenBank.balanceOf(user1), amount / 2);
        
        // 再次存款
        token.transferWithCallback(address(tokenBank), amount);
        assertEq(tokenBank.balanceOf(user1), amount / 2 + amount);
        
        vm.stopPrank();
    }
}
