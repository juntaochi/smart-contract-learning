// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/JacToken.sol";
import "../contracts/TokenBankV2.sol";

contract TokenBankPermitTest is Test {
    JacToken public token;
    TokenBankV2 public bank;
    address public user;
    uint256 public userPrivateKey = 0xA11CE;

    function setUp() public {
        user = vm.addr(userPrivateKey);

        // 部署代币
        vm.prank(user);
        token = new JacToken();

        // 部署 TokenBank
        bank = new TokenBankV2(address(token));
    }

    function testPermitDeposit() public {
        uint256 depositAmount = 1000 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(user);

        // 构建 EIP-712 签名
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                user,
                address(bank),
                depositAmount,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);

        // 检查初始状态
        assertEq(bank.balanceOf(user), 0);
        assertEq(token.balanceOf(user), 10_000_000 * 10 ** 18);

        // 执行 permitDeposit
        vm.prank(user);
        bank.permitDeposit(depositAmount, deadline, v, r, s);

        // 验证存款成功
        assertEq(bank.balanceOf(user), depositAmount);
        assertEq(token.balanceOf(user), 10_000_000 * 10 ** 18 - depositAmount);
        assertEq(token.balanceOf(address(bank)), depositAmount);

        // 验证 nonce 增加
        assertEq(token.nonces(user), nonce + 1);
    }

    function testPermitDepositWithExpiredSignature() public {
        uint256 depositAmount = 1000 * 10 ** 18;
        uint256 deadline = block.timestamp - 1; // 已过期
        uint256 nonce = token.nonces(user);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                user,
                address(bank),
                depositAmount,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);

        // 应该失败
        vm.expectRevert();
        vm.prank(user);
        bank.permitDeposit(depositAmount, deadline, v, r, s);
    }

    function testPermitDepositGasSaving() public {
        uint256 depositAmount = 1000 * 10 ** 18;

        // 方法 1: 传统 approve + deposit
        vm.prank(user);
        token.approve(address(bank), depositAmount);

        vm.prank(user);
        uint256 gasUsedTraditional = gasleft();
        bank.deposit(depositAmount);
        gasUsedTraditional = gasUsedTraditional - gasleft();

        // 方法 2: permitDeposit
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(user);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                user,
                address(bank),
                depositAmount,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);

        vm.prank(user);
        uint256 gasUsedPermit = gasleft();
        bank.permitDeposit(depositAmount, deadline, v, r, s);
        gasUsedPermit = gasUsedPermit - gasleft();

        // permitDeposit 在单笔交易中完成，总体节省 gas（无需单独的 approve 交易）
        console.log("Traditional deposit gas:", gasUsedTraditional);
        console.log("Permit deposit gas:", gasUsedPermit);
        console.log("Permit saves one approve transaction!");
    }
}
