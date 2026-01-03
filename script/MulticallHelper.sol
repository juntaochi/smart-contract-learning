// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MulticallHelper
 * @dev Helper library for encoding multicall data for AirdropMerkleNFTMarket
 */
library MulticallHelper {
    /**
     * @dev Encodes permitPrePay function call
     * @param owner Token owner
     * @param spender Spender address (market contract)
     * @param value Amount to approve
     * @param deadline Permit deadline
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     */
    function encodePermitPrePay(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (bytes memory) {
        return abi.encodeWithSignature(
            "permitPrePay(address,address,uint256,uint256,uint8,bytes32,bytes32)",
            owner,
            spender,
            value,
            deadline,
            v,
            r,
            s
        );
    }

    /**
     * @dev Encodes claimNFT function call
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     * @param merkleProof Merkle proof
     */
    function encodeClaimNFT(
        address nftContract,
        uint256 tokenId,
        bytes32[] memory merkleProof
    ) internal pure returns (bytes memory) {
        return abi.encodeWithSignature(
            "claimNFT(address,uint256,bytes32[])",
            nftContract,
            tokenId,
            merkleProof
        );
    }

    /**
     * @dev Builds multicall data array
     * @param calls Array of encoded calls
     */
    function buildMulticallData(
        bytes[] memory calls
    ) internal pure returns (bytes memory) {
        return abi.encodeWithSignature("multicall(bytes[])", calls);
    }
}
