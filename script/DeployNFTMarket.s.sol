// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/NFTMarket.sol";
import "../contracts/MyToken.sol";
import "../contracts/YangmingGardenNFT.sol";

contract DeployNFTMarket is Script {
    function run() external {
        vm.startBroadcast();
        address deployer = msg.sender;

        // 1. Deploy Payment Token (ERC20)
        MyToken token = new MyToken("Test Token", "TEST");
        console.log("Payment Token deployed at:", address(token));

        // 2. Deploy NFT Contract (ERC721)
        YangmingGardenNFT nft = new YangmingGardenNFT();
        console.log("NFT Contract deployed at:", address(nft));

        // 3. Deploy Market (deployer is also the projectOwner for whitelist signing)
        NFTMarket market = new NFTMarket(address(token), deployer);
        console.log("NFT Market deployed at:", address(market));

        // 4. Setup initial state for testing
        // Mint tokens to deployer
        // MyToken has a _mint in constructor but we might want more?
        // Actually MyToken constructor might not mint to msg.sender depending on implementation.
        // Let's check MyToken again, but usually it's fine.

        // Mint NFT to deployer
        nft.safeMint(deployer, "ipfs://test");
        console.log("Minted NFT #0 to deployer");

        // Approve Market to sell NFT #0
        nft.approve(address(market), 0);
        console.log("Approved market to sell NFT #0");

        vm.stopBroadcast();
    }
}
