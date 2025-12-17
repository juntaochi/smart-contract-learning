// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/TokenBank.sol";
import "../contracts/BaseERC20.sol";

contract TokenBankTest is Test {
    BaseERC20 public token;
    TokenBank public tokenBank;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        // 部署 ERC20 代币合约
        token = new BaseERC20();
        
        // 部署 TokenBank 合约
        tokenBank = new TokenBank(address(token));
        
        // 给 user1 和 user2 分配一些代币
        token.transfer(user1, 1000 * 10**18);
        token.transfer(user2, 1000 * 10**18);
    }
    
    function testDeposit() public {
        uint256 depositAmount = 100 * 10**18;
        
        vm.startPrank(user1);
        
        // 授权 TokenBank 合约
        token.approve(address(tokenBank), depositAmount);
        
        // 存入代币
        tokenBank.deposit(depositAmount);
        
        vm.stopPrank();
        
        // 验证存款余额
        assertEq(tokenBank.balanceOf(user1), depositAmount);
        assertEq(token.balanceOf(address(tokenBank)), depositAmount);
        assertEq(token.balanceOf(user1), 900 * 10**18);
    }
    
    function testMultipleDeposits() public {
        uint256 depositAmount1 = 100 * 10**18;
        uint256 depositAmount2 = 50 * 10**18;
        
        vm.startPrank(user1);
        
        // 第一次存款
        token.approve(address(tokenBank), depositAmount1);
        tokenBank.deposit(depositAmount1);
        
        // 第二次存款
        token.approve(address(tokenBank), depositAmount2);
        tokenBank.deposit(depositAmount2);
        
        vm.stopPrank();
        
        // 验证总存款
        assertEq(tokenBank.balanceOf(user1), depositAmount1 + depositAmount2);
    }
    
    function testWithdraw() public {
        uint256 depositAmount = 100 * 10**18;
        uint256 withdrawAmount = 60 * 10**18;
        
        vm.startPrank(user1);
        
        // 先存入
        token.approve(address(tokenBank), depositAmount);
        tokenBank.deposit(depositAmount);
        
        // 提取部分
        tokenBank.withdraw(withdrawAmount);
        
        vm.stopPrank();
        
        // 验证余额
        assertEq(tokenBank.balanceOf(user1), depositAmount - withdrawAmount);
        assertEq(token.balanceOf(user1), 1000 * 10**18 - depositAmount + withdrawAmount);
    }
    
    function testWithdrawAll() public {
        uint256 depositAmount = 100 * 10**18;
        
        vm.startPrank(user1);
        
        // 存入
        token.approve(address(tokenBank), depositAmount);
        tokenBank.deposit(depositAmount);
        
        // 全部提取
        tokenBank.withdraw(depositAmount);
        
        vm.stopPrank();
        
        // 验证余额归零
        assertEq(tokenBank.balanceOf(user1), 0);
        assertEq(token.balanceOf(user1), 1000 * 10**18);
    }
    
    function testRevertWhenWithdrawInsufficientBalance() public {
        uint256 depositAmount = 100 * 10**18;
        
        vm.startPrank(user1);
        
        // 存入
        token.approve(address(tokenBank), depositAmount);
        tokenBank.deposit(depositAmount);
        
        // 尝试提取超过存款的金额（应该失败）
        vm.expectRevert("TokenBank: insufficient balance");
        tokenBank.withdraw(depositAmount + 1);
        
        vm.stopPrank();
    }
    
    function testRevertWhenDepositZeroAmount() public {
        vm.prank(user1);
        // 尝试存入 0 金额（应该失败）
        vm.expectRevert("TokenBank: deposit amount must be greater than 0");
        tokenBank.deposit(0);
    }
    
    function testRevertWhenWithdrawZeroAmount() public {
        vm.prank(user1);
        // 尝试提取 0 金额（应该失败）
        vm.expectRevert("TokenBank: withdraw amount must be greater than 0");
        tokenBank.withdraw(0);
    }
    
    function testRevertWhenWithdrawWithoutDeposit() public {
        vm.prank(user1);
        // 没有存款就尝试提取（应该失败）
        vm.expectRevert("TokenBank: insufficient balance");
        tokenBank.withdraw(100 * 10**18);
    }
    
    function testMultipleUsers() public {
        uint256 depositAmount1 = 100 * 10**18;
        uint256 depositAmount2 = 200 * 10**18;
        
        // user1 存款
        vm.startPrank(user1);
        token.approve(address(tokenBank), depositAmount1);
        tokenBank.deposit(depositAmount1);
        vm.stopPrank();
        
        // user2 存款
        vm.startPrank(user2);
        token.approve(address(tokenBank), depositAmount2);
        tokenBank.deposit(depositAmount2);
        vm.stopPrank();
        
        // 验证各自的余额
        assertEq(tokenBank.balanceOf(user1), depositAmount1);
        assertEq(tokenBank.balanceOf(user2), depositAmount2);
        assertEq(token.balanceOf(address(tokenBank)), depositAmount1 + depositAmount2);
    }
    
    function testDepositEvent() public {
        uint256 depositAmount = 100 * 10**18;
        
        vm.startPrank(user1);
        token.approve(address(tokenBank), depositAmount);
        
        // 期望触发 Deposit 事件
        vm.expectEmit(true, false, false, true);
        emit TokenBank.Deposit(user1, depositAmount);
        
        tokenBank.deposit(depositAmount);
        vm.stopPrank();
    }
    
    function testWithdrawEvent() public {
        uint256 depositAmount = 100 * 10**18;
        
        vm.startPrank(user1);
        token.approve(address(tokenBank), depositAmount);
        tokenBank.deposit(depositAmount);
        
        // 期望触发 Withdraw 事件
        vm.expectEmit(true, false, false, true);
        emit TokenBank.Withdraw(user1, depositAmount);
        
        tokenBank.withdraw(depositAmount);
        vm.stopPrank();
    }
}
