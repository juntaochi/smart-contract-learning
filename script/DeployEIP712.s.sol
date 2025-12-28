// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/JacToken.sol";
import "../contracts/TokenBankV2.sol";
import "../contracts/JacNFT.sol";
import "../contracts/NFTMarket.sol";

contract DeployEIP712 is Script {
    function run() external {
        // 指定接收代币的地址
        address recipient = 0x5D26552Fe617460250e68e737F2A60eA6402eEA9;

        vm.startBroadcast();

        console.log("Deploying EIP-712 contracts...");
        console.log("Deployer:", msg.sender);
        console.log("Token Recipient:", recipient);

        // 1. Deploy JacToken
        JacToken token = new JacToken();
        console.log("\n1. JacToken deployed at:", address(token));
        console.log(
            "   Initial supply:",
            token.totalSupply() / 10 ** 18,
            "JAC"
        );

        // 转移所有代币到指定地址
        uint256 totalSupply = token.totalSupply();
        token.transfer(recipient, totalSupply);
        console.log("   Transferred all tokens to:", recipient);
        console.log(
            "   Recipient balance:",
            token.balanceOf(recipient) / 10 ** 18,
            "JAC"
        );

        // 2. Deploy TokenBankV2
        TokenBankV2 tokenBank = new TokenBankV2(address(token));
        console.log("\n2. TokenBankV2 deployed at:", address(tokenBank));

        // 3. Deploy JacNFT
        JacNFT nft = new JacNFT();
        console.log("\n3. JacNFT deployed at:", address(nft));

        // 4. Deploy NFTMarket (deployer is projectOwner for whitelist signing)
        NFTMarket market = new NFTMarket(address(token), msg.sender);
        console.log("\n4. NFTMarket deployed at:", address(market));
        console.log("   Project Owner:", msg.sender);

        // 5. Mint a test NFT and list it
        uint256 tokenId = nft.mint(msg.sender);
        console.log("\n5. Minted NFT #", tokenId, "to deployer");

        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, 100 * 10 ** 18); // 100 JAC
        console.log("   Listed NFT #", tokenId, "for 100 JAC");

        console.log("\n=== Deployment Complete ===");
        console.log("\nContract Addresses:");
        console.log("JAC_TOKEN_ADDRESS:", address(token));
        console.log("TOKEN_BANK_ADDRESS:", address(tokenBank));
        console.log("JAC_NFT_ADDRESS:", address(nft));
        console.log("NFT_MARKET_ADDRESS:", address(market));
        console.log("PROJECT_OWNER:", msg.sender);
        console.log("\nToken holder:", recipient);

        vm.stopBroadcast();
    }
}
