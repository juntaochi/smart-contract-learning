// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/ERC20WithCallback.sol";
import "../contracts/TokenBankV2.sol";

contract InteractTokenBankV2 is Script {
    function run() external {
        // 使用 anvil 的第一个账户
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        
        // 合约地址（从部署日志中获取）
        address tokenAddress = 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707;
        address tokenBankAddress = 0x0165878A594ca255338adfa4d48449f69242Eb8F;
        
        ERC20WithCallback token = ERC20WithCallback(tokenAddress);
        TokenBankV2 tokenBank = TokenBankV2(tokenBankAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        address user = vm.addr(deployerPrivateKey);
        
        console.log("=== Initial State ===");
        console.log("User address:", user);
        console.log("User token balance:", token.balanceOf(user));
        console.log("TokenBank deposit balance:", tokenBank.balanceOf(user));
        console.log("TokenBank token holdings:", token.balanceOf(tokenBankAddress));
        
        // 使用 transferWithCallback 直接存入 1000 个代币
        uint256 depositAmount = 1000 * 10**18;
        console.log("\n=== One-Step Deposit via transferWithCallback ===");
        console.log("Depositing", depositAmount / 10**18, "tokens using transferWithCallback");
        
        token.transferWithCallback(tokenBankAddress, depositAmount);
        console.log("Deposit completed (no approve needed!)");
        
        console.log("\n=== After Callback Deposit ===");
        console.log("User token balance:", token.balanceOf(user));
        console.log("TokenBank deposit balance:", tokenBank.balanceOf(user));
        console.log("TokenBank token holdings:", token.balanceOf(tokenBankAddress));
        
        // 再次使用 transferWithCallback 存入 500 个代币
        uint256 depositAmount2 = 500 * 10**18;
        console.log("\n=== Second Deposit ===");
        console.log("Depositing another", depositAmount2 / 10**18, "tokens");
        
        token.transferWithCallback(tokenBankAddress, depositAmount2);
        
        console.log("\n=== After Second Deposit ===");
        console.log("TokenBank deposit balance:", tokenBank.balanceOf(user));
        
        // 提取 600 个代币
        uint256 withdrawAmount = 600 * 10**18;
        console.log("\n=== Withdrawing", withdrawAmount / 10**18, "tokens ===");
        
        tokenBank.withdraw(withdrawAmount);
        console.log("Withdraw completed");
        
        console.log("\n=== After Withdraw ===");
        console.log("User token balance:", token.balanceOf(user));
        console.log("TokenBank deposit balance:", tokenBank.balanceOf(user));
        console.log("TokenBank token holdings:", token.balanceOf(tokenBankAddress));
        
        // 测试传统方式存款仍然可用
        uint256 traditionalAmount = 200 * 10**18;
        console.log("\n=== Testing Traditional Deposit (approve + deposit) ===");
        console.log("Depositing", traditionalAmount / 10**18, "tokens using traditional method");
        
        token.approve(tokenBankAddress, traditionalAmount);
        tokenBank.deposit(traditionalAmount);
        
        console.log("\n=== Final State ===");
        console.log("User token balance:", token.balanceOf(user));
        console.log("TokenBank deposit balance:", tokenBank.balanceOf(user));
        console.log("TokenBank token holdings:", token.balanceOf(tokenBankAddress));
        
        vm.stopBroadcast();
        
        console.log("\n=== Test Summary ===");
        console.log("1st callback deposit: 1000 tokens");
        console.log("2nd callback deposit: 500 tokens");
        console.log("Withdrawal: 600 tokens");
        console.log("Traditional deposit: 200 tokens");
        console.log("Final balance:", tokenBank.balanceOf(user) / 10**18, "tokens");
        console.log("Expected: 1100 tokens");
        
        require(tokenBank.balanceOf(user) == 1100 * 10**18, "Balance mismatch!");
        console.log("\nAll tests passed! TokenBankV2 works perfectly!");
    }
}
