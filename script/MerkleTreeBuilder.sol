// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MerkleTreeBuilder
 * @dev Utility library for building and verifying Merkle trees
 * Used for generating whitelist proofs in tests and scripts
 */
library MerkleTreeBuilder {
    /**
     * @dev Sorts and hashes two nodes
     * @param a First node
     * @param b Second node
     * @return Hash of the two nodes in sorted order
     */
    function hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    /**
     * @dev Verifies a Merkle proof
     * @param proof Array of sibling hashes forming the proof
     * @param root The Merkle root
     * @param leaf The leaf node to verify
     * @return True if the proof is valid
     */
    function verify(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = hashPair(computedHash, proof[i]);
        }

        return computedHash == root;
    }

    /**
     * @dev Generates a Merkle proof for a given address in the whitelist
     * @param whitelist Array of whitelisted addresses
     * @param index Index of the address to generate proof for
     * @return proof The Merkle proof
     */
    function getProof(
        address[] memory whitelist,
        uint256 index
    ) internal pure returns (bytes32[] memory proof) {
        require(index < whitelist.length, "MerkleTreeBuilder: index out of bounds");
        
        uint256 n = whitelist.length;
        uint256 treeHeight = 0;
        uint256 temp = n;
        while (temp > 1) {
            treeHeight++;
            temp = (temp + 1) / 2;
        }

        proof = new bytes32[](treeHeight);
        uint256 proofIndex = 0;

        // Build the tree and collect proof
        bytes32[] memory currentLevel = new bytes32[](n);
        for (uint256 i = 0; i < n; i++) {
            currentLevel[i] = keccak256(abi.encodePacked(whitelist[i]));
        }

        uint256 currentIndex = index;
        
        while (currentLevel.length > 1) {
            uint256 nextLevelSize = (currentLevel.length + 1) / 2;
            bytes32[] memory nextLevel = new bytes32[](nextLevelSize);

            for (uint256 i = 0; i < currentLevel.length; i += 2) {
                if (i + 1 < currentLevel.length) {
                    nextLevel[i / 2] = hashPair(currentLevel[i], currentLevel[i + 1]);
                    
                    // Add sibling to proof if current index is at this position
                    if (i == currentIndex) {
                        proof[proofIndex++] = currentLevel[i + 1];
                    } else if (i + 1 == currentIndex) {
                        proof[proofIndex++] = currentLevel[i];
                    }
                } else {
                    // Odd number of nodes, carry over the last one
                    nextLevel[i / 2] = currentLevel[i];
                }
            }

            currentLevel = nextLevel;
            currentIndex = currentIndex / 2;
        }

        return proof;
    }

    /**
     * @dev Generates the Merkle root from a list of addresses
     * @param whitelist Array of whitelisted addresses
     * @return root The Merkle root
     */
    function getRoot(address[] memory whitelist) internal pure returns (bytes32 root) {
        require(whitelist.length > 0, "MerkleTreeBuilder: empty whitelist");

        uint256 n = whitelist.length;
        bytes32[] memory currentLevel = new bytes32[](n);

        // Hash all addresses to create leaf nodes
        for (uint256 i = 0; i < n; i++) {
            currentLevel[i] = keccak256(abi.encodePacked(whitelist[i]));
        }

        // Build the tree bottom-up
        while (currentLevel.length > 1) {
            uint256 nextLevelSize = (currentLevel.length + 1) / 2;
            bytes32[] memory nextLevel = new bytes32[](nextLevelSize);

            for (uint256 i = 0; i < currentLevel.length; i += 2) {
                if (i + 1 < currentLevel.length) {
                    nextLevel[i / 2] = hashPair(currentLevel[i], currentLevel[i + 1]);
                } else {
                    // Odd number of nodes, carry over the last one
                    nextLevel[i / 2] = currentLevel[i];
                }
            }

            currentLevel = nextLevel;
        }

        return currentLevel[0];
    }
}
