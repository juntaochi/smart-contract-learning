// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/YangmingGardenNFT.sol";

contract MintYangmingNFT is Script {
    // 已部署的合约地址
    address constant NFT_CONTRACT = 0xE28bE663C67d330A28a32062ad5dD0F18aDde9e6;

    // NFT Metadata URI (IPFS)
    string constant METADATA_URI =
        "ipfs://QmVAmGHmV3Y3CqvkCSnHW6yY72mw4k7y9yfmZyqHokCZr8";

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Minting NFT to:", deployer);
        console.log("Metadata URI:", METADATA_URI);

        vm.startBroadcast(deployerPrivateKey);

        YangmingGardenNFT nft = YangmingGardenNFT(NFT_CONTRACT);

        // 铸造 NFT
        uint256 tokenId = nft.safeMint(deployer, METADATA_URI);

        console.log("NFT minted with tokenId:", tokenId);
        console.log("Token URI:", nft.tokenURI(tokenId));
        console.log("Total minted:", nft.totalMinted());

        vm.stopBroadcast();
    }
}
