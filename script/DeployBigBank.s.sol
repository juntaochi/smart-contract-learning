// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/bank.sol";

/**
 * 部署 BigBank 合约到测试网
 * Usage: forge script script/DeployBigBank.s.sol --rpc-url <RPC> --broadcast --verify
 */
contract DeployBigBank is Script {
    function run() external {
        // 从 .env 文件读取 PRIVATE_KEY
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying with account:", deployer);
        console.log("Account balance:", deployer.balance);

        // Deploy BigBank
        BigBank bank = new BigBank();
        console.log("BigBank deployed at:", address(bank));
        console.log("Initial admin:", bank.admin());
        console.log("Min deposit:", bank.MIN_DEPOSIT());

        vm.stopBroadcast();

        console.log("\n======================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("======================================");
        console.log("BigBank Address:", address(bank));
        console.log("Admin (deployer):", deployer);
        console.log("Minimum Deposit:", bank.MIN_DEPOSIT(), "wei");
        console.log("\nNext steps:");
        console.log("1. Copy the BigBank address");
        console.log("2. Use Safe to transfer admin via transferAdmin(address)");
        console.log("======================================");
    }
}
