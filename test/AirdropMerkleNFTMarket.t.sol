// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/JacToken.sol";
import "../contracts/JacNFT.sol";
import "../contracts/AirdropMerkleNFTMarket.sol";
import "../script/MerkleTreeBuilder.sol";
import "../script/MulticallHelper.sol";

contract AirdropMerkleNFTMarketTest is Test {
    using MerkleTreeBuilder for *;

    JacToken public token;
    JacNFT public nft;
    AirdropMerkleNFTMarket public market;

    address public seller;
    address public whitelistedBuyer;
    address public nonWhitelistedBuyer;
    address public whitelistedBuyer2;

    uint256 public sellerPrivateKey = 0xA11CE;
    uint256 public whitelistedBuyerPrivateKey = 0xB0B;
    uint256 public nonWhitelistedBuyerPrivateKey = 0xBAD;
    uint256 public whitelistedBuyer2PrivateKey = 0xC0FFEE;

    uint256 public constant NFT_PRICE = 100 * 10 ** 18;

    bytes32 public merkleRoot;
    address[] public whitelist;

    function setUp() public {
        seller = vm.addr(sellerPrivateKey);
        whitelistedBuyer = vm.addr(whitelistedBuyerPrivateKey);
        nonWhitelistedBuyer = vm.addr(nonWhitelistedBuyerPrivateKey);
        whitelistedBuyer2 = vm.addr(whitelistedBuyer2PrivateKey);

        // Deploy token
        vm.prank(seller);
        token = new JacToken();

        // Distribute tokens
        vm.startPrank(seller);
        token.transfer(whitelistedBuyer, 1000 * 10 ** 18);
        token.transfer(nonWhitelistedBuyer, 1000 * 10 ** 18);
        token.transfer(whitelistedBuyer2, 1000 * 10 ** 18);
        vm.stopPrank();

        // Deploy NFT
        vm.prank(seller);
        nft = new JacNFT();

        // Build whitelist and Merkle tree
        whitelist.push(whitelistedBuyer);
        whitelist.push(whitelistedBuyer2);
        merkleRoot = MerkleTreeBuilder.getRoot(whitelist);

        // Deploy market
        market = new AirdropMerkleNFTMarket(address(token), merkleRoot);
    }

    function testMulticallPermitAndClaim() public {
        // 1. Seller mints and lists NFT
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. Prepare permit signature for whitelisted buyer
        uint256 deadline = block.timestamp + 1 hours;
        uint256 discountedPrice = NFT_PRICE / 2;

        bytes32 permitHash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                token.DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        keccak256(
                            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                        ),
                        whitelistedBuyer,
                        address(market),
                        discountedPrice,
                        token.nonces(whitelistedBuyer),
                        deadline
                    )
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            whitelistedBuyerPrivateKey,
            permitHash
        );

        // 3. Get Merkle proof for whitelisted buyer
        bytes32[] memory proof = MerkleTreeBuilder.getProof(whitelist, 0);

        // 4. Build multicall data
        bytes[] memory calls = new bytes[](2);
        calls[0] = abi.encodeWithSignature(
            "permitPrePay(address,address,uint256,uint256,uint8,bytes32,bytes32)",
            whitelistedBuyer,
            address(market),
            discountedPrice,
            deadline,
            v,
            r,
            s
        );
        calls[1] = abi.encodeWithSignature(
            "claimNFT(address,uint256,bytes32[])",
            address(nft),
            tokenId,
            proof
        );

        // 5. Execute multicall
        uint256 buyerBalanceBefore = token.balanceOf(whitelistedBuyer);
        uint256 sellerBalanceBefore = token.balanceOf(seller);

        vm.prank(whitelistedBuyer);
        market.multicall(calls);

        // 6. Verify results
        assertEq(nft.ownerOf(tokenId), whitelistedBuyer, "NFT not transferred to buyer");
        assertEq(
            token.balanceOf(whitelistedBuyer),
            buyerBalanceBefore - discountedPrice,
            "Incorrect buyer balance"
        );
        assertEq(
            token.balanceOf(seller),
            sellerBalanceBefore + discountedPrice,
            "Incorrect seller balance"
        );
    }

    function testClaimNFTWithValidProof() public {
        // 1. Seller mints and lists NFT
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. Whitelisted buyer approves tokens
        uint256 discountedPrice = NFT_PRICE / 2;
        vm.prank(whitelistedBuyer);
        token.approve(address(market), discountedPrice);

        // 3. Get Merkle proof
        bytes32[] memory proof = MerkleTreeBuilder.getProof(whitelist, 0);

        // 4. Claim NFT
        uint256 buyerBalanceBefore = token.balanceOf(whitelistedBuyer);
        uint256 sellerBalanceBefore = token.balanceOf(seller);

        vm.prank(whitelistedBuyer);
        market.claimNFT(address(nft), tokenId, proof);

        // 5. Verify results
        assertEq(nft.ownerOf(tokenId), whitelistedBuyer);
        assertEq(
            token.balanceOf(whitelistedBuyer),
            buyerBalanceBefore - discountedPrice
        );
        assertEq(token.balanceOf(seller), sellerBalanceBefore + discountedPrice);
    }

    function testClaimNFTWithInvalidProof() public {
        // 1. Seller mints and lists NFT
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. Non-whitelisted buyer tries to claim
        uint256 discountedPrice = NFT_PRICE / 2;
        vm.prank(nonWhitelistedBuyer);
        token.approve(address(market), discountedPrice);

        // 3. Get proof for whitelisted buyer (wrong proof)
        bytes32[] memory proof = MerkleTreeBuilder.getProof(whitelist, 0);

        // 4. Should fail
        vm.prank(nonWhitelistedBuyer);
        vm.expectRevert("Not in whitelist");
        market.claimNFT(address(nft), tokenId, proof);
    }

    function testClaimNFTWithCorrectDiscount() public {
        // 1. Seller mints and lists NFT
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. Verify discounted price
        uint256 discountedPrice = market.getDiscountedPrice(address(nft), tokenId);
        assertEq(discountedPrice, NFT_PRICE / 2, "Incorrect discount");

        // 3. Whitelisted buyer claims
        vm.prank(whitelistedBuyer);
        token.approve(address(market), discountedPrice);

        bytes32[] memory proof = MerkleTreeBuilder.getProof(whitelist, 0);

        uint256 buyerBalanceBefore = token.balanceOf(whitelistedBuyer);
        uint256 sellerBalanceBefore = token.balanceOf(seller);

        vm.prank(whitelistedBuyer);
        market.claimNFT(address(nft), tokenId, proof);

        // 4. Verify exactly 50% was paid
        assertEq(
            token.balanceOf(whitelistedBuyer),
            buyerBalanceBefore - (NFT_PRICE / 2)
        );
        assertEq(token.balanceOf(seller), sellerBalanceBefore + (NFT_PRICE / 2));
    }

    function testPermitPrePay() public {
        uint256 amount = 100 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;

        // Build permit signature
        bytes32 permitHash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                token.DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        keccak256(
                            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                        ),
                        whitelistedBuyer,
                        address(market),
                        amount,
                        token.nonces(whitelistedBuyer),
                        deadline
                    )
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            whitelistedBuyerPrivateKey,
            permitHash
        );

        // Call permitPrePay
        vm.prank(whitelistedBuyer);
        market.permitPrePay(
            whitelistedBuyer,
            address(market),
            amount,
            deadline,
            v,
            r,
            s
        );

        // Verify allowance
        assertEq(token.allowance(whitelistedBuyer, address(market)), amount);
    }

    function testMulticallRevert() public {
        // 1. Seller mints and lists NFT
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. Prepare valid permit
        uint256 deadline = block.timestamp + 1 hours;
        uint256 discountedPrice = NFT_PRICE / 2;

        bytes32 permitHash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                token.DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        keccak256(
                            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                        ),
                        whitelistedBuyer,
                        address(market),
                        discountedPrice,
                        token.nonces(whitelistedBuyer),
                        deadline
                    )
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            whitelistedBuyerPrivateKey,
            permitHash
        );

        // 3. Use WRONG proof to make claimNFT fail
        bytes32[] memory wrongProof = new bytes32[](1);
        wrongProof[0] = keccak256("wrong");

        // 4. Build multicall with valid permit but invalid proof
        bytes[] memory calls = new bytes[](2);
        calls[0] = abi.encodeWithSignature(
            "permitPrePay(address,address,uint256,uint256,uint8,bytes32,bytes32)",
            whitelistedBuyer,
            address(market),
            discountedPrice,
            deadline,
            v,
            r,
            s
        );
        calls[1] = abi.encodeWithSignature(
            "claimNFT(address,uint256,bytes32[])",
            address(nft),
            tokenId,
            wrongProof
        );

        // 5. Should revert entire multicall
        vm.prank(whitelistedBuyer);
        vm.expectRevert();
        market.multicall(calls);

        // 6. Verify no allowance was set (entire transaction reverted)
        assertEq(token.allowance(whitelistedBuyer, address(market)), 0);
    }

    function testCannotClaimUnlistedNFT() public {
        // Try to claim NFT that was never listed
        uint256 tokenId = 999;
        bytes32[] memory proof = MerkleTreeBuilder.getProof(whitelist, 0);

        vm.prank(whitelistedBuyer);
        vm.expectRevert("NFT not listed");
        market.claimNFT(address(nft), tokenId, proof);
    }

    function testSellerCanListAndDelist() public {
        // 1. Mint and list
        vm.startPrank(seller);
        uint256 tokenId = nft.mint(seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, NFT_PRICE);
        vm.stopPrank();

        // 2. Verify listing
        AirdropMerkleNFTMarket.Listing memory listing = market.getListing(
            address(nft),
            tokenId
        );
        assertTrue(listing.isActive);
        assertEq(listing.price, NFT_PRICE);
        assertEq(listing.seller, seller);

        // 3. Delist
        vm.prank(seller);
        market.delist(address(nft), tokenId);

        // 4. Verify delisted
        listing = market.getListing(address(nft), tokenId);
        assertFalse(listing.isActive);
        assertEq(nft.ownerOf(tokenId), seller);
    }

    function testMultipleWhitelistedBuyers() public {
        // 1. List two NFTs
        vm.startPrank(seller);
        uint256 tokenId1 = nft.mint(seller);
        uint256 tokenId2 = nft.mint(seller);
        nft.approve(address(market), tokenId1);
        nft.approve(address(market), tokenId2);
        market.list(address(nft), tokenId1, NFT_PRICE);
        market.list(address(nft), tokenId2, NFT_PRICE);
        vm.stopPrank();

        // 2. First whitelisted buyer claims first NFT
        vm.prank(whitelistedBuyer);
        token.approve(address(market), NFT_PRICE / 2);
        bytes32[] memory proof1 = MerkleTreeBuilder.getProof(whitelist, 0);
        vm.prank(whitelistedBuyer);
        market.claimNFT(address(nft), tokenId1, proof1);

        // 3. Second whitelisted buyer claims second NFT
        vm.prank(whitelistedBuyer2);
        token.approve(address(market), NFT_PRICE / 2);
        bytes32[] memory proof2 = MerkleTreeBuilder.getProof(whitelist, 1);
        vm.prank(whitelistedBuyer2);
        market.claimNFT(address(nft), tokenId2, proof2);

        // 4. Verify both purchases
        assertEq(nft.ownerOf(tokenId1), whitelistedBuyer);
        assertEq(nft.ownerOf(tokenId2), whitelistedBuyer2);
    }

    function testMerkleTreeBuilder() public {
        // Test Merkle tree building
        address[] memory testList = new address[](3);
        testList[0] = address(0x1);
        testList[1] = address(0x2);
        testList[2] = address(0x3);

        bytes32 root = MerkleTreeBuilder.getRoot(testList);
        
        // Get proof for first address
        bytes32[] memory proof = MerkleTreeBuilder.getProof(testList, 0);
        
        // Verify proof
        bytes32 leaf = keccak256(abi.encodePacked(testList[0]));
        bool valid = MerkleTreeBuilder.verify(proof, root, leaf);
        assertTrue(valid, "Merkle proof should be valid");

        // Verify invalid proof
        bytes32 wrongLeaf = keccak256(abi.encodePacked(address(0x999)));
        bool invalid = MerkleTreeBuilder.verify(proof, root, wrongLeaf);
        assertFalse(invalid, "Invalid proof should fail verification");
    }
}
