// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/YangmingGardenNFT.sol";

contract BatchMintYangmingNFT is Script {
    // 主网已部署的合约地址
    address constant NFT_CONTRACT = 0xaE7b784f299384b5161104314731b090bB630847;

    // NFT Metadata URI (IPFS)
    string constant METADATA_URI =
        "ipfs://QmVAmGHmV3Y3CqvkCSnHW6yY72mw4k7y9yfmZyqHokCZr8";

    // 批量铸造数量
    uint256 constant MINT_COUNT = 9;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log(
            "Batch minting",
            MINT_COUNT,
            "NFTs on MAINNET to:",
            deployer
        );

        vm.startBroadcast(deployerPrivateKey);

        YangmingGardenNFT nft = YangmingGardenNFT(NFT_CONTRACT);

        uint256 startTokenId = nft.totalMinted();
        console.log("Starting from Token ID:", startTokenId);

        // 批量铸造
        string[] memory uris = new string[](MINT_COUNT);
        for (uint256 i = 0; i < MINT_COUNT; i++) {
            uris[i] = METADATA_URI;
        }
        nft.batchMint(deployer, uris);

        console.log(
            "Minted Token IDs:",
            startTokenId,
            "to",
            nft.totalMinted() - 1
        );
        console.log("Total minted:", nft.totalMinted());

        vm.stopBroadcast();
    }
}
