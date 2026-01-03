// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title AirdropMerkleNFTMarket
 * @dev NFT marketplace with Merkle tree whitelist verification
 * Whitelisted users can purchase NFTs at 50% discount using permit authorization
 * Supports multicall with delegatecall for atomic permit + claim operations
 */
contract AirdropMerkleNFTMarket {
    // NFT listing structure
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool isActive;
    }

    // Payment token contract (must support permit)
    IERC20 public paymentToken;

    // Merkle root for whitelist verification
    bytes32 public merkleRoot;

    // Listings: nftContract => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // Events
    event NFTListed(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 price
    );

    event NFTSold(
        address indexed seller,
        address indexed buyer,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 paidPrice
    );

    event NFTDelisted(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId
    );

    /**
     * @dev Constructor
     * @param _paymentToken ERC20 token with permit support
     * @param _merkleRoot Merkle root for whitelist verification
     */
    constructor(address _paymentToken, bytes32 _merkleRoot) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_merkleRoot != bytes32(0), "Invalid merkle root");
        
        paymentToken = IERC20(_paymentToken);
        merkleRoot = _merkleRoot;
    }

    /**
     * @dev List an NFT for sale
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     * @param price Sale price in payment tokens (full price, discount applied for whitelist)
     */
    function list(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external {
        require(price > 0, "Price must be greater than 0");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.getApproved(tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "Market not approved"
        );

        // Transfer NFT to market
        nft.transferFrom(msg.sender, address(this), tokenId);

        // Store listing
        listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            isActive: true
        });

        emit NFTListed(msg.sender, nftContract, tokenId, price);
    }

    /**
     * @dev Delist an NFT
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     */
    function delist(address nftContract, uint256 tokenId) external {
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.isActive, "NFT not listed");
        require(listing.seller == msg.sender, "Not the seller");

        listing.isActive = false;

        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit NFTDelisted(msg.sender, nftContract, tokenId);
    }

    /**
     * @dev Call permit on the payment token to authorize this contract
     * This function is meant to be called via multicall with delegatecall
     * @param owner Token owner (the buyer)
     * @param spender Spender address (should be this contract)
     * @param value Amount to approve
     * @param deadline Permit deadline
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     */
    function permitPrePay(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        IERC20Permit(address(paymentToken)).permit(owner, spender, value, deadline, v, r, s);
    }

    /**
     * @dev Claim NFT with whitelist verification and 50% discount
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     * @param merkleProof Merkle proof for whitelist verification
     */
    function claimNFT(
        address nftContract,
        uint256 tokenId,
        bytes32[] calldata merkleProof
    ) public {
        // Verify whitelist
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(merkleProof, merkleRoot, leaf),
            "Not in whitelist"
        );

        // Get listing
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.isActive, "NFT not listed");
        require(listing.seller != msg.sender, "Cannot buy own NFT");

        // Calculate discounted price (50% off)
        uint256 discountedPrice = listing.price / 2;
        address seller = listing.seller;

        // Mark as sold
        listing.isActive = false;

        // Transfer discounted payment to seller
        require(
            paymentToken.transferFrom(msg.sender, seller, discountedPrice),
            "Payment failed"
        );

        // Transfer NFT to buyer
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit NFTSold(seller, msg.sender, nftContract, tokenId, listing.price, discountedPrice);
    }

    /**
     * @dev Multicall with delegatecall
     * Allows atomic execution of multiple functions (e.g., permitPrePay + claimNFT)
     * @param data Array of encoded function calls
     * @return results Array of return data from each call
     */
    function multicall(bytes[] calldata data) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            require(success, "Multicall: delegatecall failed");
            results[i] = result;
        }
        
        return results;
    }

    /**
     * @dev Get listing information
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     */
    function getListing(
        address nftContract,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return listings[nftContract][tokenId];
    }

    /**
     * @dev Calculate discounted price for whitelisted users
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     */
    function getDiscountedPrice(
        address nftContract,
        uint256 tokenId
    ) external view returns (uint256) {
        Listing memory listing = listings[nftContract][tokenId];
        require(listing.isActive, "NFT not listed");
        return listing.price / 2;
    }
}
