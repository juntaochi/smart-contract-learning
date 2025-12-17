// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/BaseERC20.sol";
import "../contracts/TokenBank.sol";

contract InteractTokenBank is Script {
    function run() external {
        // 使用 anvil 的第一个账户
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        
        // 合约地址（从部署日志中获取）
        address tokenAddress = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
        address tokenBankAddress = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
        
        BaseERC20 token = BaseERC20(tokenAddress);
        TokenBank tokenBank = TokenBank(tokenBankAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        address user = vm.addr(deployerPrivateKey);
        
        console.log("=== Before Deposit ===");
        console.log("User address:", user);
        console.log("User token balance:", token.balanceOf(user));
        console.log("TokenBank balance:", tokenBank.balanceOf(user));
        console.log("TokenBank token holdings:", token.balanceOf(tokenBankAddress));
        
        // 存入 1000 个代币 (1000 * 10^18)
        uint256 depositAmount = 1000 * 10**18;
        console.log("\n=== Depositing", depositAmount / 10**18, "tokens ===");
        
        // 授权
        token.approve(tokenBankAddress, depositAmount);
        console.log("Approved TokenBank to spend tokens");
        
        // 存入
        tokenBank.deposit(depositAmount);
        console.log("Deposit completed");
        
        console.log("\n=== After Deposit ===");
        console.log("User token balance:", token.balanceOf(user));
        console.log("TokenBank balance:", tokenBank.balanceOf(user));
        console.log("TokenBank token holdings:", token.balanceOf(tokenBankAddress));
        
        // 提取 500 个代币
        uint256 withdrawAmount = 500 * 10**18;
        console.log("\n=== Withdrawing", withdrawAmount / 10**18, "tokens ===");
        
        tokenBank.withdraw(withdrawAmount);
        console.log("Withdraw completed");
        
        console.log("\n=== After Withdraw ===");
        console.log("User token balance:", token.balanceOf(user));
        console.log("TokenBank balance:", tokenBank.balanceOf(user));
        console.log("TokenBank token holdings:", token.balanceOf(tokenBankAddress));
        
        vm.stopBroadcast();
        
        console.log("\n=== Test Summary ===");
        console.log("Initial deposit: 1000 tokens");
        console.log("Withdrawal: 500 tokens");
        console.log("Final TokenBank balance:", tokenBank.balanceOf(user) / 10**18, "tokens");
        console.log("Expected: 500 tokens");
        
        require(tokenBank.balanceOf(user) == 500 * 10**18, "Balance mismatch!");
        console.log("\nAll tests passed!");
    }
}
