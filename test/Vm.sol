// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

// Minimal Foundry cheatcodes interface (no forge-std dependency).
// Docs: https://book.getfoundry.sh/cheatcodes/
interface Vm {
    function deal(address account, uint256 newBalance) external;
    function prank(address msgSender) external;
    function startPrank(address msgSender) external;
    function stopPrank() external;
    function expectRevert(bytes calldata revertData) external;
}

library VmUtils {
    // Standard HEVM cheatcode address used by Foundry.
    address internal constant HEVM_ADDRESS = address(uint160(uint256(keccak256("hevm cheat code"))));

    function vm() internal pure returns (Vm) {
        return Vm(HEVM_ADDRESS);
    }
}

