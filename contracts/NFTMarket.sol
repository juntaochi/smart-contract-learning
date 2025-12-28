// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ITokenReceiverWithData.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title NFTMarket
 * @dev NFT 交易市场合约
 * 支持使用 ERC20 代币购买 NFT
 * 实现了 ITokenReceiverWithData 接口，支持通过 transferWithCallback 购买
 * 支持 EIP-712 白名单签名购买（permitBuy）
 */
contract NFTMarket is ITokenReceiverWithData, EIP712 {
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

    // 项目方地址（白名单签名者）
    address public projectOwner;

    // 上架列表：nftContract => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // 用户 nonce（防重放）
    mapping(address => uint256) public nonces;

    // EIP-712 类型哈希
    bytes32 public constant WHITELIST_TYPEHASH =
        keccak256(
            "WhitelistPermit(address buyer,address nftContract,uint256 tokenId,uint256 nonce,uint256 deadline)"
        );

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
     * @param _projectOwner 项目方地址（白名单签名者）
     */
    constructor(
        address _paymentToken,
        address _projectOwner
    ) EIP712("NFTMarket", "1") {
        require(
            _paymentToken != address(0),
            "NFTMarket: invalid payment token"
        );
        require(
            _projectOwner != address(0),
            "NFTMarket: invalid project owner"
        );
        paymentToken = IERC20(_paymentToken);
        projectOwner = _projectOwner;
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

    /**
     * @dev 白名单签名购买 (EIP-712)
     * 项目方通过链下签名授权特定地址购买特定 NFT
     * @param nftContract NFT 合约地址
     * @param tokenId NFT Token ID
     * @param deadline 签名过期时间
     * @param v 签名参数 v
     * @param r 签名参数 r
     * @param s 签名参数 s
     */
    function permitBuy(
        address nftContract,
        uint256 tokenId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // 1. 验证未过期
        require(block.timestamp <= deadline, "NFTMarket: signature expired");

        // 2. 构建 EIP-712 哈希
        bytes32 structHash = keccak256(
            abi.encode(
                WHITELIST_TYPEHASH,
                msg.sender,
                nftContract,
                tokenId,
                nonces[msg.sender]++,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);

        // 3. 恢复签名者地址
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == projectOwner, "NFTMarket: invalid signature");

        // 4. 获取上架信息
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.isActive, "NFTMarket: NFT not listed");
        require(listing.seller != msg.sender, "NFTMarket: cannot buy own NFT");

        uint256 price = listing.price;
        address seller = listing.seller;

        // 5. 标记为已售
        listing.isActive = false;

        // 6. 转移代币给卖家
        require(
            paymentToken.transferFrom(msg.sender, seller, price),
            "NFTMarket: payment failed"
        );

        // 7. 转移 NFT 给买家
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit NFTSold(seller, msg.sender, nftContract, tokenId, price);
    }

    /**
     * @dev 获取 EIP-712 域分隔符（用于测试和前端）
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
