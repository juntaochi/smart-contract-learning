// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/MyToken.sol";

contract DeployMyToken is Script {
    function run() external {
        // 从环境变量获取私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署 MyToken 合约
        // name: "MyToken", symbol: "MTK"
        MyToken token = new MyToken("MyToken", "MTK");
        
        console.log("MyToken deployed at:", address(token));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Total supply:", token.totalSupply());
        
        vm.stopBroadcast();
    }
}
