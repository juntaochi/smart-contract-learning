// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ITokenReceiverWithData.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title NFTMarket
 * @dev NFT 交易市场合约
 * 支持使用 ERC20 代币购买 NFT
 * 实现了 ITokenReceiverWithData 接口，支持通过 transferWithCallback 购买
 */
contract NFTMarket is ITokenReceiverWithData {
    // NFT 上架信息结构
    struct Listing {
        address seller; // 卖家地址
        address nftContract; // NFT 合约地址
        uint256 tokenId; // NFT Token ID
        uint256 price; // 价格（ERC20 代币数量）
        bool isActive; // 是否在售
    }

    // 支付代币合约地址
    IERC20 public paymentToken;

    // 上架列表：nftContract => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // 事件
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

    /**
     * @dev 构造函数
     * @param _paymentToken 用于支付的 ERC20 代币合约地址
     */
    constructor(address _paymentToken) {
        require(
            _paymentToken != address(0),
            "NFTMarket: invalid payment token"
        );
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @dev 上架 NFT
     * @param nftContract NFT 合约地址
     * @param tokenId NFT Token ID
     * @param price 售价（ERC20 代币数量）
     *
     * 注意：调用前需要先 approve NFT 给本合约
     */
    function list(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external {
        require(price > 0, "NFTMarket: price must be greater than 0");

        IERC721 nft = IERC721(nftContract);

        // 验证调用者是 NFT 持有者
        require(nft.ownerOf(tokenId) == msg.sender, "NFTMarket: not the owner");

        // 验证合约已被授权
        require(
            nft.getApproved(tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "NFTMarket: not approved"
        );

        // 将 NFT 转移到市场合约
        nft.transferFrom(msg.sender, address(this), tokenId);

        // 记录上架信息
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
     * @dev 普通购买 NFT（需要先 approve 代币给本合约）
     * @param nftContract NFT 合约地址
     * @param tokenId NFT Token ID
     */
    function buyNFT(address nftContract, uint256 tokenId) external {
        Listing storage listing = listings[nftContract][tokenId];

        require(listing.isActive, "NFTMarket: NFT not listed");
        require(listing.seller != msg.sender, "NFTMarket: cannot buy own NFT");

        uint256 price = listing.price;
        address seller = listing.seller;

        // 标记为已售
        listing.isActive = false;

        // 转移代币给卖家
        require(
            paymentToken.transferFrom(msg.sender, seller, price),
            "NFTMarket: payment failed"
        );

        // 转移 NFT 给买家
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit NFTSold(seller, msg.sender, nftContract, tokenId, price);
    }

    /**
     * @dev 实现 ITokenReceiverWithData 接口
     * 通过 transferWithCallback 购买 NFT
     * @param from 代币发送者（即买家）
     * @param amount 代币数量
     * @param data 编码的购买信息（nftContract, tokenId）
     */
    function tokensReceived(
        address from,
        uint256 amount,
        bytes calldata data
    ) external override returns (bool) {
        // 验证调用者是支付代币合约
        require(
            msg.sender == address(paymentToken),
            "NFTMarket: invalid token"
        );

        // 解码数据获取 NFT 信息
        require(data.length >= 64, "NFTMarket: invalid data");
        (address nftContract, uint256 tokenId) = abi.decode(
            data,
            (address, uint256)
        );

        Listing storage listing = listings[nftContract][tokenId];

        require(listing.isActive, "NFTMarket: NFT not listed");
        require(listing.seller != from, "NFTMarket: cannot buy own NFT");
        require(amount >= listing.price, "NFTMarket: insufficient payment");

        uint256 price = listing.price;
        address seller = listing.seller;

        // 标记为已售
        listing.isActive = false;

        // 转移代币给卖家
        require(
            paymentToken.transfer(seller, price),
            "NFTMarket: payment to seller failed"
        );

        // 如果多付了，退还多余的代币
        if (amount > price) {
            require(
                paymentToken.transfer(from, amount - price),
                "NFTMarket: refund failed"
            );
        }

        // 转移 NFT 给买家
        IERC721(nftContract).transferFrom(address(this), from, tokenId);

        emit NFTSold(seller, from, nftContract, tokenId, price);

        return true;
    }

    /**
     * @dev 下架 NFT（仅卖家可调用）
     * @param nftContract NFT 合约地址
     * @param tokenId NFT Token ID
     */
    function delist(address nftContract, uint256 tokenId) external {
        Listing storage listing = listings[nftContract][tokenId];

        require(listing.isActive, "NFTMarket: NFT not listed");
        require(listing.seller == msg.sender, "NFTMarket: not the seller");

        // 标记为已下架
        listing.isActive = false;

        // 退还 NFT 给卖家
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit NFTDelisted(msg.sender, nftContract, tokenId);
    }

    /**
     * @dev 获取 NFT 上架信息
     * @param nftContract NFT 合约地址
     * @param tokenId NFT Token ID
     */
    function getListing(
        address nftContract,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return listings[nftContract][tokenId];
    }
}
