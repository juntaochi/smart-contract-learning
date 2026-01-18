// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./NFTMarketV1.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title NFTMarketV2
 * @dev Upgradeable NFT marketplace - Version 2
 * Adds offline signature-based listing functionality
 * Users can use setApprovalForAll once, then list via signatures
 */
contract NFTMarketV2 is NFTMarketV1 {
    // EIP-712 type hash for listing signature
    bytes32 public constant LISTING_TYPEHASH = keccak256(
        "ListingSignature(address nftContract,uint256 tokenId,uint256 price,uint256 nonce,uint256 deadline)"
    );

    // Nonces for signature replay protection: seller => nftContract => tokenId => nonce
    mapping(address => mapping(address => mapping(uint256 => uint256))) public nonces;

    // EIP-712 domain separator
    bytes32 private _DOMAIN_SEPARATOR;

    // Events
    event NFTListedWithSignature(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price,
        address submitter
    );

    /**
     * @dev Initialize V2 (called after upgrade)
     * Sets up EIP-712 domain separator
     */
    function initializeV2() public reinitializer(2) {
        _DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("NFTMarket")),
                keccak256(bytes("2")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @dev List NFT using seller's offline signature
     * Seller signs: (nftContract, tokenId, price, nonce, deadline)
     * Anyone can submit the signature to list the NFT
     * 
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     * @param price Sale price in payment tokens
     * @param deadline Signature expiration timestamp
     * @param seller The NFT owner who signed
     * @param v Signature parameter
     * @param r Signature parameter
     * @param s Signature parameter
     */
    function listWithSignature(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        address seller,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(price > 0, "Price must be greater than 0");
        require(block.timestamp <= deadline, "Signature expired");
        
        IERC721 nft = IERC721(nftContract);
        
        // Verify seller owns the NFT
        require(nft.ownerOf(tokenId) == seller, "Seller not owner");
        
        // Verify market has approval (via setApprovalForAll)
        require(
            nft.isApprovedForAll(seller, address(this)),
            "Market not approved by seller"
        );
        
        // Build EIP-712 hash
        uint256 nonce = nonces[seller][nftContract][tokenId];
        bytes32 structHash = keccak256(
            abi.encode(
                LISTING_TYPEHASH,
                nftContract,
                tokenId,
                price,
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, structHash)
        );
        
        // Recover signer and verify
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == seller, "Invalid signature");
        
        // Increment nonce to prevent replay
        nonces[seller][nftContract][tokenId]++;
        
        // Transfer NFT to market contract
        nft.transferFrom(seller, address(this), tokenId);
        
        // Record listing
        listings[nftContract][tokenId] = Listing({
            seller: seller,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            isActive: true
        });
        
        emit NFTListedWithSignature(seller, nftContract, tokenId, price, msg.sender);
        emit NFTListed(seller, nftContract, tokenId, price);
    }

    /**
     * @dev Get nonce for a specific NFT and seller
     * Used for generating signatures
     */
    function getNonce(
        address seller,
        address nftContract,
        uint256 tokenId
    ) external view returns (uint256) {
        return nonces[seller][nftContract][tokenId];
    }

    /**
     * @dev Get EIP-712 domain separator
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _DOMAIN_SEPARATOR;
    }

    /**
     * @dev Override version function
     */
    function version() external pure override returns (string memory) {
        return "2.0.0";
    }
}
