// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/InscriptionFactory.sol";
import "../contracts/ERC20Inscription.sol";

contract InscriptionTest is Test {
    InscriptionFactory public factory;

    function setUp() public {
        factory = new InscriptionFactory();
    }

    function testDeployInscription() public {
        address token = factory.deployInscription("MEME", 1000000, 1000);
        assertTrue(token != address(0));
        assertTrue(factory.isInscription(token));

        ERC20Inscription inscription = ERC20Inscription(token);
        assertEq(inscription.symbol(), "MEME");
        assertEq(inscription.maxSupply(), 1000000);
        assertEq(inscription.perMint(), 1000);
        assertEq(inscription.totalSupply(), 0);
    }

    function testMintInscription() public {
        address token = factory.deployInscription("MEME", 1000000, 1000);

        address Alice = address(0xA11ce);
        vm.prank(Alice);
        factory.mintInscription(token);

        ERC20Inscription inscription = ERC20Inscription(token);
        assertEq(inscription.balanceOf(Alice), 1000);
        assertEq(inscription.totalSupply(), 1000);
    }

    function testMintMultipleTimes() public {
        address token = factory.deployInscription("MEME", 1000000, 1000);

        address Alice = address(0xA11ce);
        vm.startPrank(Alice);
        factory.mintInscription(token);
        factory.mintInscription(token);
        vm.stopPrank();

        ERC20Inscription inscription = ERC20Inscription(token);
        assertEq(inscription.balanceOf(Alice), 2000);
        assertEq(inscription.totalSupply(), 2000);
    }

    function testMaxSupply() public {
        address token = factory.deployInscription("MEME", 2000, 1000);

        factory.mintInscription(token);
        factory.mintInscription(token);

        vm.expectRevert("Exceeds max supply");
        factory.mintInscription(token);
    }

    function testUnauthorizedMint() public {
        // Create a random address that is not registered in factory
        address fakeToken = address(0xDEAD);

        vm.expectRevert("Not a valid inscription");
        factory.mintInscription(fakeToken);
    }

    function testTransfer() public {
        address token = factory.deployInscription("MEME", 1000000, 1000);

        address Alice = address(0xA11ce);
        address Bob = address(0xB0b);

        vm.prank(Alice);
        factory.mintInscription(token);

        ERC20Inscription inscription = ERC20Inscription(token);

        vm.prank(Alice);
        inscription.transfer(Bob, 500);

        assertEq(inscription.balanceOf(Alice), 500);
        assertEq(inscription.balanceOf(Bob), 500);
    }
}
