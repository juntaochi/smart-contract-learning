// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import "../contracts/bank.sol";
import "./TestUtils.sol";
import "./Vm.sol";

contract BankTest {
    using VmUtils for *;

    receive() external payable {}

    function _revertMsg(string memory message) internal pure returns (bytes memory) {
        return abi.encodeWithSignature("Error(string)", message);
    }

    function testDepositUpdatesBalances() public {
        Bank bank = new Bank();
        Vm vm = VmUtils.vm();

        address alice = address(0xA11CE);
        vm.deal(alice, 10 ether);

        vm.prank(alice);
        bank.deposit{value: 1 ether}();

        TestUtils.assertEq(bank.balances(alice), 1 ether, "alice balance should update");
        TestUtils.assertEq(address(bank).balance, 1 ether, "bank should hold ETH");
    }

    function testReceiveCallsDeposit() public {
        Bank bank = new Bank();
        Vm vm = VmUtils.vm();

        address alice = address(0xA11CE);
        vm.deal(alice, 10 ether);

        vm.prank(alice);
        (bool ok, ) = address(bank).call{value: 2 ether}("");
        require(ok, "send to receive() failed");

        TestUtils.assertEq(bank.balances(alice), 2 ether, "receive should record deposit");
    }

    function testWithdrawOnlyAdmin() public {
        Bank bank = new Bank();
        Vm vm = VmUtils.vm();

        address alice = address(0xA11CE);
        vm.deal(alice, 10 ether);

        vm.prank(alice);
        bank.deposit{value: 1 ether}();

        vm.expectRevert(_revertMsg("Only admin can perform this action"));
        vm.prank(alice);
        bank.withdraw();
    }

    function testWithdrawSendsAllToAdmin() public {
        Bank bank = new Bank();
        Vm vm = VmUtils.vm();

        address admin = address(this);
        address alice = address(0xA11CE);
        vm.deal(alice, 10 ether);

        uint256 adminBefore = admin.balance;

        vm.prank(alice);
        bank.deposit{value: 3 ether}();

        bank.withdraw();

        TestUtils.assertEq(address(bank).balance, 0, "bank should be emptied");
        TestUtils.assertEq(admin.balance, adminBefore + 3 ether, "admin should receive all ETH");
    }

    function testTopDepositorsTracksTop3() public {
        Bank bank = new Bank();
        Vm vm = VmUtils.vm();

        address a = address(0xA);
        address b = address(0xB);
        address c = address(0xC);
        address d = address(0xD);

        vm.deal(a, 10 ether);
        vm.deal(b, 10 ether);
        vm.deal(c, 10 ether);
        vm.deal(d, 10 ether);

        vm.prank(a);
        bank.deposit{value: 1 ether}();
        vm.prank(b);
        bank.deposit{value: 2 ether}();
        vm.prank(c);
        bank.deposit{value: 3 ether}();

        address[] memory top = bank.getTopDepositors();
        TestUtils.assertEq(top.length, 3, "topDepositors should have 3 entries");
        TestUtils.assertEq(top[0], c, "top[0] should be c");
        TestUtils.assertEq(top[1], b, "top[1] should be b");
        TestUtils.assertEq(top[2], a, "top[2] should be a");

        vm.prank(d);
        bank.deposit{value: 4 ether}();

        top = bank.getTopDepositors();
        TestUtils.assertEq(top.length, 3, "topDepositors should still have 3 entries");
        TestUtils.assertEq(top[0], d, "top[0] should be d");
        TestUtils.assertEq(top[1], c, "top[1] should be c");
        TestUtils.assertEq(top[2], b, "top[2] should be b");
    }
}

contract BigBankTest {
    using VmUtils for *;

    receive() external payable {}

    function _revertMsg(string memory message) internal pure returns (bytes memory) {
        return abi.encodeWithSignature("Error(string)", message);
    }

    function testBigBankMinimumDeposit() public {
        BigBank bigBank = new BigBank();
        Vm vm = VmUtils.vm();

        address alice = address(0xA11CE);
        vm.deal(alice, 1 ether);

        vm.expectRevert(_revertMsg("Deposit below minimum"));
        vm.prank(alice);
        bigBank.deposit{value: 0.0001 ether}();

        uint256 min = bigBank.MIN_DEPOSIT();
        vm.prank(alice);
        bigBank.deposit{value: min}();

        TestUtils.assertEq(bigBank.balances(alice), min, "min deposit should pass");
    }

    function testTransferAdminOnlyAdmin() public {
        BigBank bigBank = new BigBank();
        Vm vm = VmUtils.vm();

        address alice = address(0xA11CE);

        vm.expectRevert(_revertMsg("Only admin can perform this action"));
        vm.prank(alice);
        bigBank.transferAdmin(address(0xBEEF));
    }

    function testAdminContractCanWithdrawViaBigBankAdminRole() public {
        BigBank bigBank = new BigBank();
        Admin adminContract = new Admin();
        Vm vm = VmUtils.vm();

        bigBank.transferAdmin(address(adminContract));

        address depositor = address(0xD00D);
        vm.deal(depositor, 10 ether);

        vm.prank(depositor);
        bigBank.deposit{value: 1 ether}();

        uint256 ownerBefore = address(this).balance;

        adminContract.adminWithdraw(bigBank);
        adminContract.withdrawToOwner();

        TestUtils.assertEq(address(bigBank).balance, 0, "bigBank should be emptied");
        TestUtils.assertEq(address(adminContract).balance, 0, "admin contract should forward funds");
        TestUtils.assertEq(address(this).balance, ownerBefore + 1 ether, "owner should receive funds");
    }
}
