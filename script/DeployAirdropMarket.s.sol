// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/JacToken.sol";
import "../contracts/JacNFT.sol";
import "../contracts/AirdropMerkleNFTMarket.sol";
import "../script/MerkleTreeBuilder.sol";

/**
 * @title DeployAirdropMarket
 * @dev Example script showing how to deploy and use AirdropMerkleNFTMarket
 * 
 * This demonstrates:
 * 1. Building a Merkle tree from a whitelist
 * 2. Deploying the market contract
 * 3. Listing an NFT
 * 4. Generating permit signature
 * 5. Using multicall to permit + claim in one transaction
 */
contract DeployAirdropMarket is Script {
    using MerkleTreeBuilder for *;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy token and NFT
        JacToken token = new JacToken();
        JacNFT nft = new JacNFT();

        // 2. Build whitelist
        address[] memory whitelist = new address[](3);
        whitelist[0] = 0x1234567890123456789012345678901234567890;
        whitelist[1] = 0x2345678901234567890123456789012345678901;
        whitelist[2] = 0x3456789012345678901234567890123456789012;

        bytes32 merkleRoot = MerkleTreeBuilder.getRoot(whitelist);
        
        console.log("Merkle Root:");
        console.logBytes32(merkleRoot);

        // 3. Deploy market
        AirdropMerkleNFTMarket market = new AirdropMerkleNFTMarket(
            address(token),
            merkleRoot
        );

        console.log("Deployed AirdropMerkleNFTMarket at:", address(market));
        console.log("Payment Token:", address(token));
        console.log("NFT Contract:", address(nft));

        // 4. Example: Mint and list an NFT
        uint256 tokenId = nft.mint(deployer);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, 100 * 10 ** 18); // 100 tokens

        console.log("Listed NFT #", tokenId, "for 100 tokens (50 tokens for whitelisted)");

        // 5. Log Merkle proofs for each whitelisted address
        console.log("\nMerkle Proofs for Whitelisted Addresses:");
        for (uint256 i = 0; i < whitelist.length; i++) {
            bytes32[] memory proof = MerkleTreeBuilder.getProof(whitelist, i);
            console.log("\nAddress:", whitelist[i]);
            console.log("Proof length:", proof.length);
            for (uint256 j = 0; j < proof.length; j++) {
                console.log("  Proof[", j, "]:");
                console.logBytes32(proof[j]);
            }
        }

        vm.stopBroadcast();
    }
}
