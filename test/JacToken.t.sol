// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/JacToken.sol";

contract JacTokenTest is Test {
    JacToken public token;
    address public owner;
    address public spender;
    uint256 public ownerPrivateKey = 0xA11CE;
    uint256 public spenderPrivateKey = 0xB0B;

    function setUp() public {
        owner = vm.addr(ownerPrivateKey);
        spender = vm.addr(spenderPrivateKey);

        vm.prank(owner);
        token = new JacToken();
    }

    function testInitialSupply() public view {
        assertEq(token.totalSupply(), 10_000_000 * 10 ** 18);
        assertEq(token.balanceOf(owner), 10_000_000 * 10 ** 18);
    }

    function testPermit() public {
        uint256 value = 1000 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(owner);

        // 构建 EIP-712 签名
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        // 签名
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);

        // 执行 permit
        token.permit(owner, spender, value, deadline, v, r, s);

        // 验证授权
        assertEq(token.allowance(owner, spender), value);
        assertEq(token.nonces(owner), nonce + 1);
    }

    function testPermitExpired() public {
        uint256 value = 1000 * 10 ** 18;
        uint256 deadline = block.timestamp - 1; // 已过期
        uint256 nonce = token.nonces(owner);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);

        // 应该失败
        vm.expectRevert();
        token.permit(owner, spender, value, deadline, v, r, s);
    }

    function testPermitInvalidSignature() public {
        uint256 value = 1000 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(owner);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        // 使用错误的私钥签名
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(spenderPrivateKey, digest);

        // 应该失败
        vm.expectRevert();
        token.permit(owner, spender, value, deadline, v, r, s);
    }

    function testPermitReplay() public {
        uint256 value = 1000 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(owner);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);

        // 第一次成功
        token.permit(owner, spender, value, deadline, v, r, s);

        // 第二次应该失败（nonce 已增加）
        vm.expectRevert();
        token.permit(owner, spender, value, deadline, v, r, s);
    }
}
