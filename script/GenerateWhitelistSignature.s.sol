// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/NFTMarket.sol";

/**
 * @title GenerateWhitelistSignature
 * @dev 项目方使用此脚本为买家生成白名单签名
 */
contract GenerateWhitelistSignature is Script {
    // Sepolia 部署的 NFTMarket 地址
    address constant NFT_MARKET = 0x4da1B8900A066A8b6f2198b028FAE5635b6aE5ea;
    address constant JAC_NFT = 0xE845959F4A838f3114b52317f7BC6dA48B0De8e5;
    
    function run() external view {
        // 白名单买家地址
        address buyer = 0x5D26552Fe617460250e68e737F2A60eA6402eEA9;
        
        // NFT Token ID
        uint256 tokenId = 0;
        
        // 过期时间（1小时后）
        uint256 deadline = block.timestamp + 3600;
        
        console.log("\n=== Whitelist Signature Generation ===\n");
        console.log("NFT Market:", NFT_MARKET);
        console.log("Buyer Address:", buyer);
        console.log("NFT Token ID:", tokenId);
        console.log("Deadline (Unix):", deadline);
        console.log("Deadline (readable):", _timestampToString(deadline));
        
        NFTMarket market = NFTMarket(NFT_MARKET);
        
        // 获取买家当前的 nonce
        uint256 nonce = market.nonces(buyer);
        console.log("Buyer Nonce:", nonce);
        
        // 获取 Domain Separator 和 Typehash
        bytes32 domainSeparator = market.DOMAIN_SEPARATOR();
        bytes32 whitelistTypehash = market.WHITELIST_TYPEHASH();
        
        console.log("\nDomain Separator:", vm.toString(domainSeparator));
        console.log("Whitelist Typehash:", vm.toString(whitelistTypehash));
        
        // 构建结构化哈希
        bytes32 structHash = keccak256(
            abi.encode(
                whitelistTypehash,
                buyer,
                JAC_NFT,
                tokenId,
                nonce,
                deadline
            )
        );
        
        console.log("\nStruct Hash:", vm.toString(structHash));
        
        // 构建最终的 digest (EIP-712)
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator,
                structHash
            )
        );
        
        console.log("Final Digest:", vm.toString(digest));
        
        console.log("\n");
        console.log("==========================================");
        console.log("NEXT STEPS:");
        console.log("==========================================");
        console.log("\n1. 使用你的私钥签名这个 digest:");
        console.log("   cast wallet sign", vm.toString(digest), "--private-key YOUR_PRIVATE_KEY");
        console.log("\n2. 将生成的签名复制到前端页面");
        console.log("\n3. 买家使用签名购买 NFT");
        console.log("\n==========================================\n");
    }
    
    // 辅助函数：将时间戳转换为可读格式
    function _timestampToString(uint256 timestamp) internal pure returns (string memory) {
        // 简单显示为 Unix timestamp
        return vm.toString(timestamp);
    }
}
