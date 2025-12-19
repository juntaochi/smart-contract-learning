// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/NFTMarket.sol";
import "../contracts/ERC20WithCallbackAndData.sol";
import "../contracts/YangmingGardenNFT.sol";

contract NFTMarketTest is Test {
    NFTMarket public market;
    ERC20WithCallbackAndData public token;
    YangmingGardenNFT public nft;

    address public seller;
    address public buyer;
    address public buyer2;

    uint256 constant NFT_PRICE = 100 * 10 ** 18; // 100 tokens
    string constant TEST_URI = "ipfs://QmTest123";

    function setUp() public {
        seller = makeAddr("seller");
        buyer = makeAddr("buyer");
        buyer2 = makeAddr("buyer2");

        // 部署代币合约
        token = new ERC20WithCallbackAndData();

        // 部署 NFT 合约
        nft = new YangmingGardenNFT();

        // 部署市场合约
        market = new NFTMarket(address(token));

        // 给 seller 铸造 NFT
        nft.safeMint(seller, TEST_URI);

        // 给 buyer 分配代币
        token.transfer(buyer, 1000 * 10 ** 18);
        token.transfer(buyer2, 1000 * 10 ** 18);
    }

    // ============ 上架测试 ============

    function testList() public {
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        market.list(address(nft), 0, NFT_PRICE);
        vm.stopPrank();

        NFTMarket.Listing memory listing = market.getListing(address(nft), 0);

        assertEq(listing.seller, seller);
        assertEq(listing.nftContract, address(nft));
        assertEq(listing.tokenId, 0);
        assertEq(listing.price, NFT_PRICE);
        assertTrue(listing.isActive);

        // NFT 应该在市场合约中
        assertEq(nft.ownerOf(0), address(market));
    }

    function testListFailsIfNotOwner() public {
        vm.prank(buyer);
        vm.expectRevert("NFTMarket: not the owner");
        market.list(address(nft), 0, NFT_PRICE);
    }

    function testListFailsIfNotApproved() public {
        vm.prank(seller);
        vm.expectRevert("NFTMarket: not approved");
        market.list(address(nft), 0, NFT_PRICE);
    }

    function testListFailsWithZeroPrice() public {
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        vm.expectRevert("NFTMarket: price must be greater than 0");
        market.list(address(nft), 0, 0);
        vm.stopPrank();
    }

    // ============ 普通购买测试 ============

    function testBuyNFT() public {
        // 上架
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        market.list(address(nft), 0, NFT_PRICE);
        vm.stopPrank();

        uint256 sellerBalanceBefore = token.balanceOf(seller);
        uint256 buyerBalanceBefore = token.balanceOf(buyer);

        // 购买
        vm.startPrank(buyer);
        token.approve(address(market), NFT_PRICE);
        market.buyNFT(address(nft), 0);
        vm.stopPrank();

        // 验证
        assertEq(nft.ownerOf(0), buyer);
        assertEq(token.balanceOf(seller), sellerBalanceBefore + NFT_PRICE);
        assertEq(token.balanceOf(buyer), buyerBalanceBefore - NFT_PRICE);

        NFTMarket.Listing memory listing = market.getListing(address(nft), 0);
        assertFalse(listing.isActive);
    }

    function testBuyNFTFailsIfNotListed() public {
        vm.prank(buyer);
        vm.expectRevert("NFTMarket: NFT not listed");
        market.buyNFT(address(nft), 0);
    }

    function testBuyNFTFailsIfBuyOwnNFT() public {
        // 先给 seller 一些代币（在 prank 之前）
        token.transfer(seller, 200 * 10 ** 18);

        vm.startPrank(seller);
        nft.approve(address(market), 0);
        market.list(address(nft), 0, NFT_PRICE);

        token.approve(address(market), NFT_PRICE);

        vm.expectRevert("NFTMarket: cannot buy own NFT");
        market.buyNFT(address(nft), 0);
        vm.stopPrank();
    }

    // ============ 通过 transferWithCallback 购买测试 ============

    function testBuyWithCallback() public {
        // 上架
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        market.list(address(nft), 0, NFT_PRICE);
        vm.stopPrank();

        uint256 sellerBalanceBefore = token.balanceOf(seller);
        uint256 buyerBalanceBefore = token.balanceOf(buyer);

        // 通过 callback 购买
        vm.prank(buyer);
        bytes memory data = abi.encode(address(nft), uint256(0));
        token.transferWithCallback(address(market), NFT_PRICE, data);

        // 验证
        assertEq(nft.ownerOf(0), buyer);
        assertEq(token.balanceOf(seller), sellerBalanceBefore + NFT_PRICE);
        assertEq(token.balanceOf(buyer), buyerBalanceBefore - NFT_PRICE);
    }

    function testBuyWithCallbackRefundsExcess() public {
        // 上架
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        market.list(address(nft), 0, NFT_PRICE);
        vm.stopPrank();

        uint256 overpayment = 50 * 10 ** 18;
        uint256 buyerBalanceBefore = token.balanceOf(buyer);

        // 多付一些
        vm.prank(buyer);
        bytes memory data = abi.encode(address(nft), uint256(0));
        token.transferWithCallback(
            address(market),
            NFT_PRICE + overpayment,
            data
        );

        // 验证：买家只花了 NFT_PRICE
        assertEq(token.balanceOf(buyer), buyerBalanceBefore - NFT_PRICE);
        // 市场合约余额应该为 0
        assertEq(token.balanceOf(address(market)), 0);
    }

    function testBuyWithCallbackFailsInsufficientPayment() public {
        // 上架
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        market.list(address(nft), 0, NFT_PRICE);
        vm.stopPrank();

        // 付款不足
        vm.prank(buyer);
        bytes memory data = abi.encode(address(nft), uint256(0));
        vm.expectRevert("NFTMarket: insufficient payment");
        token.transferWithCallback(address(market), NFT_PRICE - 1, data);
    }

    // ============ 下架测试 ============

    function testDelist() public {
        // 上架
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        market.list(address(nft), 0, NFT_PRICE);

        // 下架
        market.delist(address(nft), 0);
        vm.stopPrank();

        // NFT 应该回到卖家手中
        assertEq(nft.ownerOf(0), seller);

        NFTMarket.Listing memory listing = market.getListing(address(nft), 0);
        assertFalse(listing.isActive);
    }

    function testDelistFailsIfNotSeller() public {
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        market.list(address(nft), 0, NFT_PRICE);
        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert("NFTMarket: not the seller");
        market.delist(address(nft), 0);
    }
}
