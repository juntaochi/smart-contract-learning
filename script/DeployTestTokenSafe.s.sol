// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/MyToken.sol";

/**
 * 安全的部署脚本 - 从 .env 文件读取私钥
 * Usage: forge script script/DeployTestTokenSafe.s.sol --rpc-url <RPC> --broadcast
 */
contract DeployTestTokenSafe is Script {
    function run() external {
        // 从 .env 文件读取 PRIVATE_KEY
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying with account:", vm.addr(deployerPrivateKey));

        // Deploy MyToken
        MyToken token = new MyToken("Test Token", "TEST");
        console.log("MyToken deployed at:", address(token));
        console.log("Total supply:", token.totalSupply());
        console.log("Deployer balance:", token.balanceOf(msg.sender));

        // Create some test accounts
        address alice = address(0x1111111111111111111111111111111111111111);
        address bob = address(0x2222222222222222222222222222222222222222);
        address charlie = address(0x3333333333333333333333333333333333333333);

        // Transfer to test accounts (creating 5 transfers)
        console.log("\n--- Creating test transfers ---");

        token.transfer(alice, 1000 * 10 ** 18);
        console.log("1. Transferred 1000 TEST to Alice");

        token.transfer(bob, 2000 * 10 ** 18);
        console.log("2. Transferred 2000 TEST to Bob");

        token.transfer(charlie, 3000 * 10 ** 18);
        console.log("3. Transferred 3000 TEST to Charlie");

        token.transfer(alice, 500 * 10 ** 18);
        console.log("4. Transferred 500 TEST to Alice (again)");

        token.transfer(bob, 750 * 10 ** 18);
        console.log("5. Transferred 750 TEST to Bob (again)");

        vm.stopBroadcast();

        console.log("\n======================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("======================================");
        console.log("Token Address:", address(token));
        console.log("Deployer (you):", vm.addr(deployerPrivateKey));
        console.log("Alice:", alice);
        console.log("Bob:", bob);
        console.log("Charlie:", charlie);
        console.log("\nCopy this token address to backend/.env:");
        console.log('TOKEN_ADDRESSES="%s"', address(token));
        console.log("======================================");
    }
}
