// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/YangmingGardenNFT.sol";

contract DeployYangmingNFT is Script {
    function run() external returns (YangmingGardenNFT) {
        // 从环境变量获取私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer address:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署 YangmingGardenNFT 合约
        YangmingGardenNFT nft = new YangmingGardenNFT();
        
        console.log("YangmingGardenNFT deployed at:", address(nft));
        console.log("Contract owner:", nft.owner());
        
        vm.stopBroadcast();
        
        return nft;
    }
}
