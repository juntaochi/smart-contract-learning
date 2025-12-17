// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import "../contracts/1_Storage.sol";
import "./TestUtils.sol";

contract StorageTest {
    function testInitialValueIsZero() public {
        Storage storageContract = new Storage();
        TestUtils.assertEq(storageContract.retrieve(), 0, "initial value should be 0");
    }

    function testStoreAndRetrieve() public {
        Storage storageContract = new Storage();
        storageContract.store(56);
        TestUtils.assertEq(storageContract.retrieve(), 56, "stored value should be 56");
    }
}

