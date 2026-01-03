// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ITokenReceiverWithData.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title NFTMarketOptimized
 * @dev Gas 优化版本的 NFT 交易市场合约
 * 
 * 优化策略：
 * 1. 使用自定义错误替代字符串错误
 * 2. 优化结构体打包（5 slots → 4 slots）
 * 3. 缓存 storage 变量到内存
 * 4. 使用 unchecked 块
 * 5. 简化逻辑和减少冗余
 */
contract NFTMarketOptimized is ITokenReceiverWithData, EIP712 {
    // ==================== 自定义错误 ====================
    error InvalidPaymentToken();
    error InvalidProjectOwner();
    error InvalidPrice();
    error NotNFTOwner();
    error NotApproved();
    error NFTNotListed();
    error CannotBuyOwnNFT();
    error PaymentFailed();
    error InvalidToken();
    error InvalidData();
    error InsufficientPayment();
    error RefundFailed();
    error NotTheSeller();
    error SignatureExpired();
    error InvalidSignature();
    error PriceExceedsLimit();

    // ==================== 优化后的结构体 ====================
    // 从 5 个 storage slots 优化到 4 个
    struct Listing {
        address seller;        // slot 0 的前 20 bytes
        uint96 price;          // slot 0 的后 12 bytes (可表示最大 ~79,228 ETH)
        address nftContract;   // slot 1 的前 20 bytes
        bool isActive;         // slot 1 的第 21 byte
        uint256 tokenId;       // slot 2 (32 bytes)
    }

    // 支付代币合约地址
    IERC20 public immutable paymentToken;

    // 项目方地址（白名单签名者）
    address public immutable projectOwner;

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
        if (_paymentToken == address(0)) revert InvalidPaymentToken();
        if (_projectOwner == address(0)) revert InvalidProjectOwner();
        
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
        if (price == 0) revert InvalidPrice();
        if (price > type(uint96).max) revert PriceExceedsLimit();

        IERC721 nft = IERC721(nftContract);

        // 验证调用者是 NFT 持有者
        if (nft.ownerOf(tokenId) != msg.sender) revert NotNFTOwner();

        // 验证合约已被授权
        if (
            nft.getApproved(tokenId) != address(this) &&
            !nft.isApprovedForAll(msg.sender, address(this))
        ) revert NotApproved();

        // 将 NFT 转移到市场合约
        nft.transferFrom(msg.sender, address(this), tokenId);

        // 记录上架信息（优化：结构体打包）
        listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            price: uint96(price),
            nftContract: nftContract,
            isActive: true,
            tokenId: tokenId
        });

        emit NFTListed(msg.sender, nftContract, tokenId, price);
    }

    /**
     * @dev 普通购买 NFT（需要先 approve 代币给本合约）
     * @param nftContract NFT 合约地址
     * @param tokenId NFT Token ID
     */
    function buyNFT(address nftContract, uint256 tokenId) external {
        // 优化：将整个 Listing 读入内存，减少 SLOAD
        Listing memory listing = listings[nftContract][tokenId];

        if (!listing.isActive) revert NFTNotListed();
        if (listing.seller == msg.sender) revert CannotBuyOwnNFT();

        // 标记为已售
        listings[nftContract][tokenId].isActive = false;

        // 转移代币给卖家
        if (!paymentToken.transferFrom(msg.sender, listing.seller, listing.price)) {
            revert PaymentFailed();
        }

        // 转移 NFT 给买家
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit NFTSold(listing.seller, msg.sender, nftContract, tokenId, listing.price);
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
        if (msg.sender != address(paymentToken)) revert InvalidToken();

        // 解码数据获取 NFT 信息
        if (data.length < 64) revert InvalidData();
        (address nftContract, uint256 tokenId) = abi.decode(
            data,
            (address, uint256)
        );

        // 优化：将整个 Listing 读入内存
        Listing memory listing = listings[nftContract][tokenId];

        if (!listing.isActive) revert NFTNotListed();
        if (listing.seller == from) revert CannotBuyOwnNFT();
        if (amount < listing.price) revert InsufficientPayment();

        // 标记为已售
        listings[nftContract][tokenId].isActive = false;

        // 转移代币给卖家
        if (!paymentToken.transfer(listing.seller, listing.price)) {
            revert PaymentFailed();
        }

        // 如果多付了，退还多余的代币
        if (amount > listing.price) {
            unchecked {
                // 安全：amount > listing.price 已经检查过
                uint256 refundAmount = amount - listing.price;
                if (!paymentToken.transfer(from, refundAmount)) {
                    revert RefundFailed();
                }
            }
        }

        // 转移 NFT 给买家
        IERC721(nftContract).transferFrom(address(this), from, tokenId);

        emit NFTSold(listing.seller, from, nftContract, tokenId, listing.price);

        return true;
    }

    /**
     * @dev 下架 NFT（仅卖家可调用）
     * @param nftContract NFT 合约地址
     * @param tokenId NFT Token ID
     */
    function delist(address nftContract, uint256 tokenId) external {
        Listing memory listing = listings[nftContract][tokenId];

        if (!listing.isActive) revert NFTNotListed();
        if (listing.seller != msg.sender) revert NotTheSeller();

        // 标记为已下架
        listings[nftContract][tokenId].isActive = false;

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
        if (block.timestamp > deadline) revert SignatureExpired();

        // 2. 构建 EIP-712 哈希（优化：使用 unchecked）
        uint256 currentNonce;
        unchecked {
            currentNonce = nonces[msg.sender]++;
        }

        bytes32 structHash = keccak256(
            abi.encode(
                WHITELIST_TYPEHASH,
                msg.sender,
                nftContract,
                tokenId,
                currentNonce,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);

        // 3. 恢复签名者地址
        address signer = ECDSA.recover(digest, v, r, s);
        if (signer != projectOwner) revert InvalidSignature();

        // 4. 获取上架信息（优化：读入内存）
        Listing memory listing = listings[nftContract][tokenId];
        if (!listing.isActive) revert NFTNotListed();
        if (listing.seller == msg.sender) revert CannotBuyOwnNFT();

        // 5. 标记为已售
        listings[nftContract][tokenId].isActive = false;

        // 6. 转移代币给卖家
        if (!paymentToken.transferFrom(msg.sender, listing.seller, listing.price)) {
            revert PaymentFailed();
        }

        // 7. 转移 NFT 给买家
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit NFTSold(listing.seller, msg.sender, nftContract, tokenId, listing.price);
    }

    /**
     * @dev 获取 EIP-712 域分隔符（用于测试和前端）
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
