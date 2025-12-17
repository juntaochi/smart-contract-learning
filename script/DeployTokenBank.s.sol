// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/BaseERC20.sol";
import "../contracts/TokenBank.sol";

contract DeployTokenBank is Script {
    function run() external {
        // 获取部署者私钥（anvil 的第一个默认账户）
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. 部署 ERC20 代币
        BaseERC20 token = new BaseERC20();
        console.log("BaseERC20 deployed at:", address(token));
        
        // 2. 部署 TokenBank
        TokenBank tokenBank = new TokenBank(address(token));
        console.log("TokenBank deployed at:", address(tokenBank));
        
        // 3. 获取部署者地址
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deployer address:", deployer);
        console.log("Deployer token balance:", token.balanceOf(deployer));
        
        vm.stopBroadcast();
    }
}
