// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/JacToken.sol";
import "../contracts/JacNFT.sol";
import "../contracts/TokenBankV2.sol";
import "../contracts/NFTMarket.sol";

/**
 * @title IntegrationTest
 * @dev 完整的 EIP-712 集成测试
 * 测试从 Token Permit 存款到 NFT 白名单购买的完整流程
 */
contract IntegrationTest is Test {
    JacToken public token;
    TokenBankV2 public tokenBank;
    JacNFT public nft;
    NFTMarket public market;

    address public user;
    address public nftSeller;
    address public projectOwner;

    uint256 public userPrivateKey = 0xA11CE;
    uint256 public sellerPrivateKey = 0xB0B;
    uint256 public projectOwnerPrivateKey = 0xC0FFEE;

    uint256 public constant DEPOSIT_AMOUNT = 1000 * 10 ** 18;
    uint256 public constant NFT_PRICE = 500 * 10 ** 18;

    function setUp() public {
        user = vm.addr(userPrivateKey);
        nftSeller = vm.addr(sellerPrivateKey);
        projectOwner = vm.addr(projectOwnerPrivateKey);

        // 部署 JacToken
        vm.prank(user);
        token = new JacToken();

        // 部署 TokenBank
        tokenBank = new TokenBankV2(address(token));

        // 部署 NFTMarket
        market = new NFTMarket(address(token), projectOwner);

        // 给 user 和 seller 分配代币
        vm.prank(user);
        token.transfer(nftSeller, 1_000_000 * 10 ** 18);

        // 部署 NFT 合约
        vm.prank(nftSeller);
        nft = new JacNFT();
    }

    function testFullIntegration() public {
        console.log("\n=== Starting Full Integration Test ===\n");

        // ==================== 第一步：Permit 存款 ====================
        console.log("Step 1: User deposits tokens using Permit signature");

        uint256 permitDeadline = block.timestamp + 1 hours;
        uint256 permitNonce = token.nonces(user);

        // 构建 Permit 签名
        bytes32 permitStructHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                user,
                address(tokenBank),
                DEPOSIT_AMOUNT,
                permitNonce,
                permitDeadline
            )
        );

        bytes32 permitDigest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                token.DOMAIN_SEPARATOR(),
                permitStructHash
            )
        );

        (uint8 pv, bytes32 pr, bytes32 ps) = vm.sign(
            userPrivateKey,
            permitDigest
        );

        // 记录存款前余额
        uint256 userBalanceBefore = token.balanceOf(user);

        // 执行 Permit 存款
        vm.prank(user);
        tokenBank.permitDeposit(DEPOSIT_AMOUNT, permitDeadline, pv, pr, ps);

        // 验证存款
        assertEq(
            tokenBank.balanceOf(user),
            DEPOSIT_AMOUNT,
            "Deposit should succeed"
        );
        assertEq(
            token.balanceOf(user),
            userBalanceBefore - DEPOSIT_AMOUNT,
            "User balance should decrease"
        );
        console.log(
            "  [OK] Deposited:",
            DEPOSIT_AMOUNT / 10 ** 18,
            "JAC tokens"
        );
        console.log(
            "  [OK] TokenBank balance:",
            tokenBank.balanceOf(user) / 10 ** 18,
            "JAC"
        );

        // ==================== 第二步：提取代币 ====================
        console.log("\nStep 2: User withdraws tokens from TokenBank");

        vm.prank(user);
        tokenBank.withdraw(DEPOSIT_AMOUNT);

        assertEq(
            tokenBank.balanceOf(user),
            0,
            "TokenBank balance should be zero"
        );
        assertEq(
            token.balanceOf(user),
            userBalanceBefore,
            "User balance should be restored"
        );
        console.log(
            "  [OK] Withdrawn:",
            DEPOSIT_AMOUNT / 10 ** 18,
            "JAC tokens"
        );
        console.log(
            "  [OK] User balance restored:",
            token.balanceOf(user) / 10 ** 18,
            "JAC"
        );

        // ==================== 第三步：NFT 上架 ====================
        console.log("\nStep 3: Seller lists NFT");

        vm.startPrank(nftSeller);
        uint256 tokenId = nft.mint(nftSeller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        console.log("  [OK] Minted NFT #", tokenId);
        console.log("  [OK] Listed for:", NFT_PRICE / 10 ** 18, "JAC tokens");

        // ==================== 第四步：白名单签名生成 ====================
        console.log("\nStep 4: Project owner generates whitelist signature");

        uint256 whitelistDeadline = block.timestamp + 1 hours;
        uint256 whitelistNonce = market.nonces(user);

        bytes32 whitelistStructHash = keccak256(
            abi.encode(
                market.WHITELIST_TYPEHASH(),
                user,
                address(nft),
                tokenId,
                whitelistNonce,
                whitelistDeadline
            )
        );

        bytes32 whitelistDigest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                market.DOMAIN_SEPARATOR(),
                whitelistStructHash
            )
        );

        (uint8 wv, bytes32 wr, bytes32 ws) = vm.sign(
            projectOwnerPrivateKey,
            whitelistDigest
        );

        console.log("  [OK] Whitelist signature generated by project owner");

        // ==================== 第五步：白名单购买 NFT ====================
        console.log("\nStep 5: User purchases NFT using whitelist signature");

        uint256 userTokenBalanceBefore = token.balanceOf(user);
        uint256 sellerTokenBalanceBefore = token.balanceOf(nftSeller);

        vm.startPrank(user);
        token.approve(address(market), NFT_PRICE);
        market.permitBuy(address(nft), tokenId, whitelistDeadline, wv, wr, ws);
        vm.stopPrank();

        // ==================== 验证最终状态 ====================
        console.log("\n=== Results ===");

        assertEq(nft.ownerOf(tokenId), user, "User should own NFT");
        console.log("  [OK] NFT #", tokenId, "transferred to user");

        uint256 userTokenBalanceAfter = token.balanceOf(user);
        uint256 sellerTokenBalanceAfter = token.balanceOf(nftSeller);

        assertEq(
            userTokenBalanceAfter,
            userTokenBalanceBefore - NFT_PRICE,
            "User should pay NFT price"
        );
        assertEq(
            sellerTokenBalanceAfter,
            sellerTokenBalanceBefore + NFT_PRICE,
            "Seller should receive payment"
        );

        console.log("  [OK] User paid:", NFT_PRICE / 10 ** 18, "JAC tokens");
        console.log(
            "  [OK] Seller received:",
            NFT_PRICE / 10 ** 18,
            "JAC tokens"
        );
        console.log(
            "  [OK] User final balance:",
            userTokenBalanceAfter / 10 ** 18,
            "JAC"
        );
        console.log(
            "  [OK] Seller final balance:",
            sellerTokenBalanceAfter / 10 ** 18,
            "JAC"
        );

        console.log("\n=== Integration Test Completed Successfully ===\n");
    }
}
