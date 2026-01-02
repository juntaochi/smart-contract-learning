// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/meme/MemeFactory.sol";
import "../../contracts/meme/MemeToken.sol";

contract MemeFactoryTest is Test {
    MemeFactory public factory;
    MemeToken public implementation;
    
    address public projectOwner = address(0x1);
    address public deployer = address(0x2);
    address public minter = address(0x3);

    function setUp() public {
        vm.prank(projectOwner);
        implementation = new MemeToken();
        
        vm.prank(projectOwner);
        factory = new MemeFactory(address(implementation));
    }

    function testDeployMeme() public {
        vm.prank(deployer);
        address memeAddr = factory.deployMeme("MEME1", 1000, 100, 0.1 ether);
        
        assertTrue(memeAddr != address(0));
        MemeToken meme = MemeToken(memeAddr);
        assertEq(meme.symbol(), "MEME1");
        assertEq(meme.maxSupply(), 1000);
        assertEq(meme.perMint(), 100);
        
        (address storedDeployer, uint256 storedPrice, bool exists) = factory.memes(memeAddr);
        assertEq(storedDeployer, deployer);
        assertEq(storedPrice, 0.1 ether);
        assertTrue(exists);
    }

    function testMintMemeFeeDistribution() public {
        vm.prank(deployer);
        address memeAddr = factory.deployMeme("MEME1", 1000, 100, 1 ether);
        
        uint256 ownerBalanceBefore = projectOwner.balance;
        uint256 deployerBalanceBefore = deployer.balance;
        
        vm.deal(minter, 10 ether);
        vm.prank(minter);
        factory.mintMeme{value: 1 ether}(memeAddr);
        
        // 1% of 1 ether = 0.01 ether
        assertEq(projectOwner.balance, ownerBalanceBefore + 0.01 ether);
        // 99% of 1 ether = 0.99 ether
        assertEq(deployer.balance, deployerBalanceBefore + 0.99 ether);
        
        MemeToken meme = MemeToken(memeAddr);
        assertEq(meme.balanceOf(minter), 100);
        assertEq(meme.totalSupply(), 100);
    }

    function testMintMemeSupplyLimit() public {
        uint256 maxSupply = 1000;
        uint256 perMint = 300; // 300 * 3 = 900, 300 * 4 = 1200 > 1000
        
        vm.prank(deployer);
        address memeAddr = factory.deployMeme("MEME1", maxSupply, perMint, 0.1 ether);
        
        vm.deal(minter, 10 ether);
        
        // Mint 1
        vm.prank(minter);
        factory.mintMeme{value: 0.1 ether}(memeAddr);
        
        // Mint 2
        vm.prank(minter);
        factory.mintMeme{value: 0.1 ether}(memeAddr);
        
        // Mint 3
        vm.prank(minter);
        factory.mintMeme{value: 0.1 ether}(memeAddr);
        
        assertEq(MemeToken(memeAddr).totalSupply(), 900);
        
        // Mint 4 should fail
        vm.prank(minter);
        vm.expectRevert("Exceeds max supply");
        factory.mintMeme{value: 0.1 ether}(memeAddr);
    }

    function testMintMemeRefund() public {
        vm.prank(deployer);
        address memeAddr = factory.deployMeme("MEME1", 1000, 100, 1 ether);
        
        vm.deal(minter, 10 ether);
        uint256 minterBalanceBefore = minter.balance;
        
        vm.prank(minter);
        factory.mintMeme{value: 2 ether}(memeAddr);
        
        // Should have spent exactly 1 ether
        assertEq(minter.balance, minterBalanceBefore - 1 ether);
    }
}
