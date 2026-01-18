// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/NFTMarketV1.sol";
import "../contracts/NFTMarketV2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC721 for testing
contract MockNFT is ERC721 {
    uint256 private _tokenIdCounter;

    constructor() ERC721("MockNFT", "MNFT") {}

    function mint(address to) external returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _mint(to, tokenId);
        return tokenId;
    }
}

// Mock ERC20 for testing
contract MockToken is ERC20 {
    constructor() ERC20("MockToken", "MTK") {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title NFTMarketUpgradeTest
 * @dev Comprehensive test suite for upgradeable NFT marketplace
 * Tests V1, V2, and upgrade process with state preservation
 */
contract NFTMarketUpgradeTest is Test {
    NFTMarketV1 public marketV1Implementation;
    NFTMarketV2 public marketV2Implementation;
    ERC1967Proxy public proxy;
    NFTMarketV1 public market; // Proxy interface
    
    MockNFT public nft;
    MockToken public token;
    
    address public owner;
    address public seller;
    address public buyer;
    address public relayer;
    
    uint256 public constant OWNER_PK = 1;
    uint256 public constant SELLER_PK = 2;
    uint256 public constant BUYER_PK = 3;
    uint256 public constant RELAYER_PK = 4;
    
    uint256 public constant INITIAL_BALANCE = 10000 * 10**18;
    uint256 public constant NFT_PRICE = 100 * 10**18;
    
    event NFTListed(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price
    );
    
    event NFTSold(
        address indexed seller,
        address indexed buyer,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );
    
    event NFTDelisted(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId
    );
    
    event NFTListedWithSignature(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price,
        address submitter
    );

    function setUp() public {
        // Generate addresses from private keys for proper signature verification
        owner = vm.addr(OWNER_PK);
        seller = vm.addr(SELLER_PK);
        buyer = vm.addr(BUYER_PK);
        relayer = vm.addr(RELAYER_PK);
        
        // Deploy mock contracts
        nft = new MockNFT();
        token = new MockToken();
        
        // Deploy V1 implementation
        marketV1Implementation = new NFTMarketV1();
        
        // Deploy proxy with V1 implementation
        bytes memory initData = abi.encodeWithSelector(
            NFTMarketV1.initialize.selector,
            address(token)
        );
        proxy = new ERC1967Proxy(address(marketV1Implementation), initData);
        
        // Cast proxy to NFTMarketV1 interface
        market = NFTMarketV1(address(proxy));
        
        // Transfer ownership to owner address
        vm.prank(address(this));
        market.transferOwnership(owner);
        
        // Setup test accounts with known private keys
        // owner = vm.addr(1), seller = vm.addr(2), buyer = vm.addr(3), relayer = vm.addr(4)
        token.mint(buyer, INITIAL_BALANCE);
        
        vm.prank(buyer);
        token.approve(address(market), type(uint256).max);
    }

    // ============================================
    // V1 Tests
    // ============================================

    function testV1_Initialize() public {
        assertEq(address(market.paymentToken()), address(token));
        assertEq(market.owner(), owner);
        assertEq(market.version(), "1.0.0");
    }

    function testV1_List() public {
        uint256 tokenId = nft.mint(seller);
        
        vm.startPrank(seller);
        nft.approve(address(market), tokenId);
        
        vm.expectEmit(true, true, true, true);
        emit NFTListed(seller, address(nft), tokenId, NFT_PRICE);
        
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();
        
        NFTMarketV1.Listing memory listing = market.getListing(address(nft), tokenId);
        assertEq(listing.seller, seller);
        assertEq(listing.nftContract, address(nft));
        assertEq(listing.tokenId, tokenId);
        assertEq(listing.price, NFT_PRICE);
        assertTrue(listing.isActive);
        assertEq(nft.ownerOf(tokenId), address(market));
    }

    function testV1_BuyNFT() public {
        uint256 tokenId = nft.mint(seller);
        
        vm.startPrank(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();
        
        uint256 sellerBalanceBefore = token.balanceOf(seller);
        uint256 buyerBalanceBefore = token.balanceOf(buyer);
        
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit NFTSold(seller, buyer, address(nft), tokenId, NFT_PRICE);
        market.buyNFT(address(nft), tokenId);
        
        assertEq(nft.ownerOf(tokenId), buyer);
        assertEq(token.balanceOf(seller), sellerBalanceBefore + NFT_PRICE);
        assertEq(token.balanceOf(buyer), buyerBalanceBefore - NFT_PRICE);
        
        NFTMarketV1.Listing memory listing = market.getListing(address(nft), tokenId);
        assertFalse(listing.isActive);
    }

    function testV1_Delist() public {
        uint256 tokenId = nft.mint(seller);
        
        vm.startPrank(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        
        vm.expectEmit(true, true, true, true);
        emit NFTDelisted(seller, address(nft), tokenId);
        
        market.delist(address(nft), tokenId);
        vm.stopPrank();
        
        assertEq(nft.ownerOf(tokenId), seller);
        
        NFTMarketV1.Listing memory listing = market.getListing(address(nft), tokenId);
        assertFalse(listing.isActive);
    }

    function testV1_CannotBuyOwnNFT() public {
        uint256 tokenId = nft.mint(seller);
        
        vm.startPrank(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        
        token.mint(seller, INITIAL_BALANCE);
        token.approve(address(market), type(uint256).max);
        
        vm.expectRevert("Cannot buy own NFT");
        market.buyNFT(address(nft), tokenId);
        vm.stopPrank();
    }

    // ============================================
    // Upgrade Tests
    // ============================================

    function testUpgrade_StatePreservation() public {
        // List multiple NFTs in V1
        uint256 tokenId1 = nft.mint(seller);
        uint256 tokenId2 = nft.mint(seller);
        
        vm.startPrank(seller);
        nft.approve(address(market), tokenId1);
        nft.approve(address(market), tokenId2);
        market.list(address(nft), tokenId1, NFT_PRICE);
        market.list(address(nft), tokenId2, NFT_PRICE * 2);
        vm.stopPrank();
        
        // Verify V1 listings
        NFTMarketV1.Listing memory listing1Before = market.getListing(address(nft), tokenId1);
        NFTMarketV1.Listing memory listing2Before = market.getListing(address(nft), tokenId2);
        
        assertEq(listing1Before.price, NFT_PRICE);
        assertEq(listing2Before.price, NFT_PRICE * 2);
        assertTrue(listing1Before.isActive);
        assertTrue(listing2Before.isActive);
        
        // Deploy V2 implementation
        marketV2Implementation = new NFTMarketV2();
        
        // Upgrade to V2
        vm.prank(owner);
        NFTMarketV1(address(proxy)).upgradeToAndCall(
            address(marketV2Implementation),
            abi.encodeWithSelector(NFTMarketV2.initializeV2.selector)
        );
        
        // Cast proxy to V2 interface
        NFTMarketV2 marketV2 = NFTMarketV2(address(proxy));
        
        // Verify version upgraded
        assertEq(marketV2.version(), "2.0.0");
        
        // Verify state preserved
        NFTMarketV1.Listing memory listing1After = marketV2.getListing(address(nft), tokenId1);
        NFTMarketV1.Listing memory listing2After = marketV2.getListing(address(nft), tokenId2);
        
        assertEq(listing1After.seller, listing1Before.seller);
        assertEq(listing1After.price, listing1Before.price);
        assertEq(listing1After.isActive, listing1Before.isActive);
        
        assertEq(listing2After.seller, listing2Before.seller);
        assertEq(listing2After.price, listing2Before.price);
        assertEq(listing2After.isActive, listing2Before.isActive);
        
        // Verify payment token preserved
        assertEq(address(marketV2.paymentToken()), address(token));
        
        // Verify V1 functions still work after upgrade
        vm.prank(buyer);
        marketV2.buyNFT(address(nft), tokenId1);
        assertEq(nft.ownerOf(tokenId1), buyer);
    }

    // ============================================
    // V2 Signature Tests
    // ============================================

    function testV2_ListWithSignature() public {
        // Upgrade to V2 first
        _upgradeToV2();
        NFTMarketV2 marketV2 = NFTMarketV2(address(proxy));
        
        // Mint NFT and approve market via setApprovalForAll
        uint256 tokenId = nft.mint(seller);
        vm.prank(seller);
        nft.setApprovalForAll(address(marketV2), true);
        
        // Generate signature
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signListing(
            SELLER_PK, // seller's private key
            address(nft),
            tokenId,
            NFT_PRICE,
            0, // nonce
            deadline,
            marketV2
        );
        
        // Anyone (relayer) can submit the signature
        vm.prank(relayer);
        vm.expectEmit(true, true, true, true);
        emit NFTListedWithSignature(seller, address(nft), tokenId, NFT_PRICE, relayer);
        
        marketV2.listWithSignature(
            address(nft),
            tokenId,
            NFT_PRICE,
            deadline,
            seller,
            v,
            r,
            s
        );
        
        // Verify listing created
        NFTMarketV1.Listing memory listing = marketV2.getListing(address(nft), tokenId);
        assertEq(listing.seller, seller);
        assertEq(listing.price, NFT_PRICE);
        assertTrue(listing.isActive);
        assertEq(nft.ownerOf(tokenId), address(marketV2));
        
        // Verify nonce incremented
        assertEq(marketV2.getNonce(seller, address(nft), tokenId), 1);
    }

    function testV2_SignatureReplayProtection() public {
        _upgradeToV2();
        NFTMarketV2 marketV2 = NFTMarketV2(address(proxy));
        
        uint256 tokenId1 = nft.mint(seller);
        uint256 tokenId2 = nft.mint(seller);
        
        vm.prank(seller);
        nft.setApprovalForAll(address(marketV2), true);
        
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signListing(
            SELLER_PK, // seller's private key
            address(nft),
            tokenId1,
            NFT_PRICE,
            0,
            deadline,
            marketV2
        );
        
        // First submission succeeds
        vm.prank(relayer);
        marketV2.listWithSignature(
            address(nft),
            tokenId1,
            NFT_PRICE,
            deadline,
            seller,
            v,
            r,
            s
        );
        
        // Buy the NFT
        vm.prank(buyer);
        marketV2.buyNFT(address(nft), tokenId1);
        
        // Seller gets token back
        vm.prank(buyer);
        nft.transferFrom(buyer, seller, tokenId1);
        
        // Try to replay signature - should fail
        vm.prank(relayer);
        vm.expectRevert("Invalid signature");
        marketV2.listWithSignature(
            address(nft),
            tokenId1,
            NFT_PRICE,
            deadline,
            seller,
            v,
            r,
            s
        );
    }

    function testV2_ExpiredSignature() public {
        _upgradeToV2();
        NFTMarketV2 marketV2 = NFTMarketV2(address(proxy));
        
        uint256 tokenId = nft.mint(seller);
        vm.prank(seller);
        nft.setApprovalForAll(address(marketV2), true);
        
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signListing(
            SELLER_PK, // seller's private key
            address(nft),
            tokenId,
            NFT_PRICE,
            0,
            deadline,
            marketV2
        );
        
        // Fast forward past deadline
        vm.warp(deadline + 1);
        
        vm.prank(relayer);
        vm.expectRevert("Signature expired");
        marketV2.listWithSignature(
            address(nft),
            tokenId,
            NFT_PRICE,
            deadline,
            seller,
            v,
            r,
            s
        );
    }

    function testV2_InvalidSignature() public {
        _upgradeToV2();
        NFTMarketV2 marketV2 = NFTMarketV2(address(proxy));
        
        uint256 tokenId = nft.mint(seller);
        vm.prank(seller);
        nft.setApprovalForAll(address(marketV2), true);
        
        uint256 deadline = block.timestamp + 1 hours;
        
        // Sign with wrong private key (buyer instead of seller)
        (uint8 v, bytes32 r, bytes32 s) = _signListing(
            BUYER_PK, // buyer's private key (wrong signer)
            address(nft),
            tokenId,
            NFT_PRICE,
            0,
            deadline,
            marketV2
        );
        
        vm.prank(relayer);
        vm.expectRevert("Invalid signature");
        marketV2.listWithSignature(
            address(nft),
            tokenId,
            NFT_PRICE,
            deadline,
            seller, // Claiming seller signed
            v,
            r,
            s
        );
    }

    // ============================================
    // Helper Functions
    // ============================================

    function _upgradeToV2() internal {
        marketV2Implementation = new NFTMarketV2();
        vm.prank(owner);
        NFTMarketV1(address(proxy)).upgradeToAndCall(
            address(marketV2Implementation),
            abi.encodeWithSelector(NFTMarketV2.initializeV2.selector)
        );
    }

    function _signListing(
        uint256 privateKey,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 nonce,
        uint256 deadline,
        NFTMarketV2 marketV2
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(
            abi.encode(
                marketV2.LISTING_TYPEHASH(),
                nftContract,
                tokenId,
                price,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                marketV2.DOMAIN_SEPARATOR(),
                structHash
            )
        );
        
        (v, r, s) = vm.sign(privateKey, digest);
    }
}
