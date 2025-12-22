// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/ERC20WithCallback.sol";
import "../contracts/TokenBankV2.sol";

contract DebugDepositTest is Test {
    ERC20WithCallback token;
    TokenBankV2 bank;
    address user = address(0x123);

    function setUp() public {
        token = new ERC20WithCallback();
        bank = new TokenBankV2(address(token));

        // Give user some tokens
        token.mint(1000 ether);
        token.transfer(user, 100 ether);
    }

    function testDeposit() public {
        vm.startPrank(user);

        uint256 amount = 10 ether;

        console.log("User Token Balance Before:", token.balanceOf(user));
        console.log(
            "Bank Token Balance Before:",
            token.balanceOf(address(bank))
        );
        console.log("User Deposit Balance Before:", bank.balanceOf(user));

        // Action: Deposit using transferWithCallback
        // This mimics what frontend does: token.transferWithCallback(bankAddress, amount)
        bool success = token.transferWithCallback(address(bank), amount);
        require(success, "Transfer failed");

        console.log("User Token Balance After:", token.balanceOf(user));
        console.log(
            "Bank Token Balance After:",
            token.balanceOf(address(bank))
        );
        console.log("User Deposit Balance After:", bank.balanceOf(user));

        // Assertions
        assertEq(
            token.balanceOf(address(bank)),
            amount,
            "Bank should receive tokens"
        );
        assertEq(
            bank.balanceOf(user),
            amount,
            "User deposit record should update"
        );

        vm.stopPrank();
    }
}
