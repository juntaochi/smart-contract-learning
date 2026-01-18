// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title NFTMarketV1
 * @dev Upgradeable NFT marketplace - Version 1
 * Basic functionality: list, buy, delist NFTs using ERC20 tokens
 */
contract NFTMarketV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    // NFT listing structure
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool isActive;
    }

    // Payment token (ERC20)
    IERC20 public paymentToken;

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
        uint256 price
    );

    event NFTDelisted(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract (replaces constructor for upgradeable pattern)
     * @param _paymentToken ERC20 token for payments
     */
    function initialize(address _paymentToken) public initializer {
        require(_paymentToken != address(0), "Invalid payment token");
        
        __Ownable_init(msg.sender);
        
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @dev List an NFT for sale
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     * @param price Sale price in payment tokens
     */
    function list(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external {
        require(price > 0, "Price must be greater than 0");
        
        IERC721 nft = IERC721(nftContract);
        
        // Verify caller is NFT owner
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        
        // Verify contract is approved
        require(
            nft.getApproved(tokenId) == address(this) ||
            nft.isApprovedForAll(msg.sender, address(this)),
            "Market not approved"
        );
        
        // Transfer NFT to market contract
        nft.transferFrom(msg.sender, address(this), tokenId);
        
        // Record listing
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
     * @dev Buy a listed NFT
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     */
    function buyNFT(address nftContract, uint256 tokenId) external {
        Listing storage listing = listings[nftContract][tokenId];
        
        require(listing.isActive, "NFT not listed");
        require(listing.seller != msg.sender, "Cannot buy own NFT");
        
        uint256 price = listing.price;
        address seller = listing.seller;
        
        // Mark as sold
        listing.isActive = false;
        
        // Transfer payment tokens to seller
        require(
            paymentToken.transferFrom(msg.sender, seller, price),
            "Payment failed"
        );
        
        // Transfer NFT to buyer
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        emit NFTSold(seller, msg.sender, nftContract, tokenId, price);
    }

    /**
     * @dev Delist an NFT (seller only)
     * @param nftContract NFT contract address
     * @param tokenId NFT token ID
     */
    function delist(address nftContract, uint256 tokenId) external {
        Listing storage listing = listings[nftContract][tokenId];
        
        require(listing.isActive, "NFT not listed");
        require(listing.seller == msg.sender, "Not the seller");
        
        // Mark as delisted
        listing.isActive = false;
        
        // Return NFT to seller
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        emit NFTDelisted(msg.sender, nftContract, tokenId);
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
     * @dev Required override for UUPS upgradeable pattern
     * Only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Get contract version
     */
    function version() external pure virtual returns (string memory) {
        return "1.0.0";
    }
}
