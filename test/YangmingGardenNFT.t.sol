// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/YangmingGardenNFT.sol";

contract YangmingGardenNFTTest is Test {
    YangmingGardenNFT public nft;
    address public owner;
    address public user1;
    address public user2;

    string constant TEST_URI = "ipfs://QmTest123456789";
    string constant TEST_URI_2 = "ipfs://QmTest987654321";

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        nft = new YangmingGardenNFT();
    }

    function testDeployment() public view {
        assertEq(nft.name(), "YangmingGardenNFT");
        assertEq(nft.symbol(), "YMNFT");
        assertEq(nft.owner(), owner);
        assertEq(nft.totalMinted(), 0);
    }

    function testMint() public {
        uint256 tokenId = nft.safeMint(user1, TEST_URI);
        
        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(0), user1);
        assertEq(nft.tokenURI(0), TEST_URI);
        assertEq(nft.balanceOf(user1), 1);
        assertEq(nft.totalMinted(), 1);
    }

    function testMultipleMints() public {
        nft.safeMint(user1, TEST_URI);
        nft.safeMint(user2, TEST_URI_2);
        
        assertEq(nft.ownerOf(0), user1);
        assertEq(nft.ownerOf(1), user2);
        assertEq(nft.tokenURI(0), TEST_URI);
        assertEq(nft.tokenURI(1), TEST_URI_2);
        assertEq(nft.totalMinted(), 2);
    }

    function testBatchMint() public {
        string[] memory uris = new string[](3);
        uris[0] = "ipfs://QmBatch1";
        uris[1] = "ipfs://QmBatch2";
        uris[2] = "ipfs://QmBatch3";
        
        nft.batchMint(user1, uris);
        
        assertEq(nft.balanceOf(user1), 3);
        assertEq(nft.totalMinted(), 3);
        assertEq(nft.tokenURI(0), "ipfs://QmBatch1");
        assertEq(nft.tokenURI(2), "ipfs://QmBatch3");
    }

    function testOnlyOwnerCanMint() public {
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                user1
            )
        );
        nft.safeMint(user1, TEST_URI);
    }

    function testOnlyOwnerCanBatchMint() public {
        string[] memory uris = new string[](1);
        uris[0] = TEST_URI;
        
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                user1
            )
        );
        nft.batchMint(user1, uris);
    }

    function testTokenURIForNonExistentToken() public {
        vm.expectRevert();
        nft.tokenURI(999);
    }

    function testSupportsInterface() public view {
        // ERC721 interface
        assertTrue(nft.supportsInterface(0x80ac58cd));
        // ERC721Metadata interface
        assertTrue(nft.supportsInterface(0x5b5e139f));
        // ERC165 interface
        assertTrue(nft.supportsInterface(0x01ffc9a7));
    }

    function testTransfer() public {
        nft.safeMint(user1, TEST_URI);
        
        vm.prank(user1);
        nft.transferFrom(user1, user2, 0);
        
        assertEq(nft.ownerOf(0), user2);
        assertEq(nft.balanceOf(user1), 0);
        assertEq(nft.balanceOf(user2), 1);
    }
}
