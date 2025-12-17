// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/ERC20WithCallback.sol";
import "../contracts/ITokenReceiver.sol";

// 用于测试的接收者合约（接受代币）
contract GoodReceiver is ITokenReceiver {
    address public lastSender;
    uint256 public lastAmount;
    
    function tokensReceived(address from, uint256 amount) external override returns (bool) {
        lastSender = from;
        lastAmount = amount;
        return true;
    }
}

// 用于测试的拒绝接收者合约（拒绝代币）
contract BadReceiver is ITokenReceiver {
    function tokensReceived(address, uint256) external pure override returns (bool) {
        return false; // 拒绝接收
    }
}

// 没有实现接口的合约
contract NonReceiverContract {
    // 这个合约没有实现 tokensReceived
}

contract ERC20WithCallbackTest is Test {
    ERC20WithCallback public token;
    GoodReceiver public goodReceiver;
    BadReceiver public badReceiver;
    NonReceiverContract public nonReceiver;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        // 部署代币合约
        token = new ERC20WithCallback();
        
        // 部署测试合约
        goodReceiver = new GoodReceiver();
        badReceiver = new BadReceiver();
        nonReceiver = new NonReceiverContract();
        
        // 给 user1 和 user2 分配代币
        token.transfer(user1, 1000 * 10**18);
        token.transfer(user2, 1000 * 10**18);
    }
    
    function testTransferWithCallbackToEOA() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(user1);
        bool success = token.transferWithCallback(user2, amount);
        
        assertTrue(success);
        assertEq(token.balanceOf(user2), 1100 * 10**18);
        assertEq(token.balanceOf(user1), 900 * 10**18);
    }
    
    function testTransferWithCallbackToGoodReceiver() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(user1);
        bool success = token.transferWithCallback(address(goodReceiver), amount);
        
        assertTrue(success);
        assertEq(token.balanceOf(address(goodReceiver)), amount);
        assertEq(token.balanceOf(user1), 900 * 10**18);
        
        // 验证回调被调用
        assertEq(goodReceiver.lastSender(), user1);
        assertEq(goodReceiver.lastAmount(), amount);
    }
    
    function testRevertWhenTransferWithCallbackToBadReceiver() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(user1);
        vm.expectRevert("ERC20: token receiver rejected tokens");
        token.transferWithCallback(address(badReceiver), amount);
    }
    
    function testRevertWhenTransferWithCallbackToNonReceiver() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(user1);
        // 合约没有实现 tokensReceived，调用会失败
        vm.expectRevert();
        token.transferWithCallback(address(nonReceiver), amount);
    }
    
    function testTransferWithCallbackEvent() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(user1);
        
        // 期望触发 Transfer 事件
        vm.expectEmit(true, true, false, true);
        emit BaseERC20.Transfer(user1, address(goodReceiver), amount);
        
        token.transferWithCallback(address(goodReceiver), amount);
    }
    
    function testRevertWhenTransferWithCallbackZeroAddress() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(user1);
        vm.expectRevert("ERC20: transfer to the zero address");
        token.transferWithCallback(address(0), amount);
    }
    
    function testRevertWhenTransferWithCallbackInsufficientBalance() public {
        uint256 amount = 2000 * 10**18; // 超过余额
        
        vm.prank(user1);
        vm.expectRevert("ERC20: transfer amount exceeds balance");
        token.transferWithCallback(user2, amount);
    }
    
    function testMultipleTransferWithCallback() public {
        uint256 amount1 = 100 * 10**18;
        uint256 amount2 = 50 * 10**18;
        
        vm.startPrank(user1);
        
        token.transferWithCallback(address(goodReceiver), amount1);
        token.transferWithCallback(address(goodReceiver), amount2);
        
        vm.stopPrank();
        
        assertEq(token.balanceOf(address(goodReceiver)), amount1 + amount2);
        assertEq(goodReceiver.lastAmount(), amount2); // 最后一次调用的金额
    }
    
    function testStandardTransferStillWorks() public {
        uint256 amount = 100 * 10**18;
        
        vm.prank(user1);
        bool success = token.transfer(user2, amount);
        
        assertTrue(success);
        assertEq(token.balanceOf(user2), 1100 * 10**18);
    }
}
