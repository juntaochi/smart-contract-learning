// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/JacToken.sol";
import "../contracts/JacNFT.sol";
import "../contracts/NFTMarket.sol";

contract NFTMarketWhitelistTest is Test {
    JacToken public token;
    JacNFT public nft;
    NFTMarket public market;

    address public seller;
    address public buyer;
    address public projectOwner;

    uint256 public sellerPrivateKey = 0xA11CE;
    uint256 public buyerPrivateKey = 0xB0B;
    uint256 public projectOwnerPrivateKey = 0xC0FFEE;

    uint256 public constant NFT_PRICE = 100 * 10 ** 18;

    function setUp() public {
        seller = vm.addr(sellerPrivateKey);
        buyer = vm.addr(buyerPrivateKey);
        projectOwner = vm.addr(projectOwnerPrivateKey);

        // 部署代币
        vm.prank(seller);
        token = new JacToken();

        // 给买家转一些代币
        vm.prank(seller);
        token.transfer(buyer, 1000 * 10 ** 18);

        // 部署 NFT
        vm.prank(seller);
        nft = new JacNFT();

        // 部署 NFTMarket
        market = new NFTMarket(address(token), projectOwner);
    }

    function testWhitelistPermitBuy() public {
        // 1. 卖家铸造并上架 NFT
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. 项目方为买家生成白名单签名
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = market.nonces(buyer);

        bytes32 structHash = keccak256(
            abi.encode(
                market.WHITELIST_TYPEHASH(),
                buyer,
                address(nft),
                tokenId,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", market.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            projectOwnerPrivateKey,
            digest
        );

        // 3. 买家授权代币并使用白名单签名购买
        vm.startPrank(buyer);
        token.approve(address(market), NFT_PRICE);

        // 记录购买前的状态
        uint256 buyerTokenBalanceBefore = token.balanceOf(buyer);
        uint256 sellerTokenBalanceBefore = token.balanceOf(seller);

        // 执行白名单购买
        market.permitBuy(address(nft), tokenId, deadline, v, r, s);
        vm.stopPrank();

        // 4. 验证结果
        assertEq(
            nft.ownerOf(tokenId),
            buyer,
            "NFT should be transferred to buyer"
        );
        assertEq(
            token.balanceOf(buyer),
            buyerTokenBalanceBefore - NFT_PRICE,
            "Buyer should pay NFT price"
        );
        assertEq(
            token.balanceOf(seller),
            sellerTokenBalanceBefore + NFT_PRICE,
            "Seller should receive payment"
        );
        assertEq(market.nonces(buyer), nonce + 1, "Nonce should increment");
    }

    function testPermitBuyWithInvalidSignature() public {
        // 1. 卖家铸造并上架 NFT
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. 使用错误的私钥签名（非项目方）
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = market.nonces(buyer);

        bytes32 structHash = keccak256(
            abi.encode(
                market.WHITELIST_TYPEHASH(),
                buyer,
                address(nft),
                tokenId,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", market.DOMAIN_SEPARATOR(), structHash)
        );

        // 使用买家的私钥签名（错误）
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(buyerPrivateKey, digest);

        // 3. 应该失败
        vm.startPrank(buyer);
        token.approve(address(market), NFT_PRICE);
        vm.expectRevert("NFTMarket: invalid signature");
        market.permitBuy(address(nft), tokenId, deadline, v, r, s);
        vm.stopPrank();
    }

    function testPermitBuyWithExpiredSignature() public {
        // 1. 卖家铸造并上架 NFT
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. 项目方生成已过期的签名
        uint256 deadline = block.timestamp - 1; // 已过期
        uint256 nonce = market.nonces(buyer);

        bytes32 structHash = keccak256(
            abi.encode(
                market.WHITELIST_TYPEHASH(),
                buyer,
                address(nft),
                tokenId,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", market.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            projectOwnerPrivateKey,
            digest
        );

        // 3. 应该失败
        vm.startPrank(buyer);
        token.approve(address(market), NFT_PRICE);
        vm.expectRevert("NFTMarket: signature expired");
        market.permitBuy(address(nft), tokenId, deadline, v, r, s);
        vm.stopPrank();
    }

    function testPermitBuyReplayProtection() public {
        // 1. 卖家铸造并上架 NFT
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. 项目方生成白名单签名
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = market.nonces(buyer);

        bytes32 structHash = keccak256(
            abi.encode(
                market.WHITELIST_TYPEHASH(),
                buyer,
                address(nft),
                tokenId,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", market.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            projectOwnerPrivateKey,
            digest
        );

        // 3. 第一次购买成功
        vm.startPrank(buyer);
        token.approve(address(market), NFT_PRICE * 2);
        market.permitBuy(address(nft), tokenId, deadline, v, r, s);
        vm.stopPrank();

        // 4. 上架第二个 NFT
        vm.startPrank(seller);
        uint256 tokenId2 = nft.mint(seller);
        nft.approve(address(market), tokenId2);
        market.list(address(nft), tokenId2, NFT_PRICE);
        vm.stopPrank();

        // 5. 尝试重放签名（nonce 已增加，应该失败）
        vm.startPrank(buyer);
        vm.expectRevert();
        market.permitBuy(address(nft), tokenId2, deadline, v, r, s);
        vm.stopPrank();
    }
}
