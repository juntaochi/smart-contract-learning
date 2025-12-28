// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/YangmingGardenNFT.sol";
import "../contracts/BaseERC20.sol";
import "../contracts/NFTMarket.sol";

contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Payment Token (BaseERC20)
        BaseERC20 token = new BaseERC20();
        console.log("BaseERC20 deployed at:", address(token));

        // 2. Deploy NFT
        YangmingGardenNFT nft = new YangmingGardenNFT();
        console.log("YangmingGardenNFT deployed at:", address(nft));

        // 3. Deploy Market
        NFTMarket market = new NFTMarket(address(token), deployer);
        console.log("NFTMarket deployed at:", address(market));

        vm.stopBroadcast();
    }
}
