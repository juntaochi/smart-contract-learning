// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/NFTMarketOptimized.sol";
import "../contracts/ERC20WithCallbackAndData.sol";
import "../contracts/YangmingGardenNFT.sol";

/**
 * @title NFTMarketOptimizedTest
 * @dev NFTMarketOptimized 合约的完整测试套件
 * 包含：上架测试、购买测试、模糊测试、不变性测试
 */
contract NFTMarketOptimizedTest is Test {
    NFTMarketOptimized public market;
    ERC20WithCallbackAndData public token;
    YangmingGardenNFT public nft;

    address public seller;
    address public buyer;
    address public buyer2;
    address public randomUser;

    uint256 constant NFT_PRICE = 100 * 10 ** 18; // 100 tokens
    string constant TEST_URI = "ipfs://QmTest123";

    // 事件定义（用于测试）
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

    function setUp() public {
        seller = makeAddr("seller");
        buyer = makeAddr("buyer");
        buyer2 = makeAddr("buyer2");
        randomUser = makeAddr("randomUser");

        // 部署代币合约
        token = new ERC20WithCallbackAndData();

        // 部署 NFT 合约
        nft = new YangmingGardenNFT();

        // 部署市场合约（seller 也作为 projectOwner）
        market = new NFTMarketOptimized(address(token), seller);

        // 给 seller 铸造 NFT (Token ID: 0)
        nft.safeMint(seller, TEST_URI);

        // 给 buyer 和 buyer2 分配代币
        token.transfer(buyer, 1000 * 10 ** 18);
        token.transfer(buyer2, 1000 * 10 ** 18);
    }

    // ==================== 上架测试 ====================

    /// @notice 测试成功上架 NFT，验证事件和状态
    function test_List_Success() public {
        vm.startPrank(seller);
        nft.approve(address(market), 0);

        // 验证事件
        vm.expectEmit(true, true, true, true);
        emit NFTListed(seller, address(nft), 0, NFT_PRICE);

        market.list(address(nft), 0, NFT_PRICE);
        vm.stopPrank();

        // 验证上架状态
        NFTMarketOptimized.Listing memory listing = market.getListing(address(nft), 0);
        assertEq(listing.seller, seller, "Seller should match");
        assertEq(
            listing.nftContract,
            address(nft),
            "NFT contract should match"
        );
        assertEq(listing.tokenId, 0, "Token ID should match");
        assertEq(listing.price, NFT_PRICE, "Price should match");
        assertTrue(listing.isActive, "Listing should be active");

        // NFT 应该在市场合约中
        assertEq(nft.ownerOf(0), address(market), "Market should own NFT");
    }

    /// @notice 测试非持有者上架失败
    function test_List_Fail_NotOwner() public {
        vm.prank(buyer);
        vm.expectRevert(NFTMarketOptimized.NotNFTOwner.selector);
        market.list(address(nft), 0, NFT_PRICE);
    }

    /// @notice 测试未授权上架失败
    function test_List_Fail_NotApproved() public {
        vm.prank(seller);
        vm.expectRevert(NFTMarketOptimized.NotApproved.selector);
        market.list(address(nft), 0, NFT_PRICE);
    }

    /// @notice 测试价格为0上架失败
    function test_List_Fail_ZeroPrice() public {
        vm.startPrank(seller);
        nft.approve(address(market), 0);
        vm.expectRevert(NFTMarketOptimized.InvalidPrice.selector);
        market.list(address(nft), 0, 0);
        vm.stopPrank();
    }

    // ==================== 购买测试 ====================

    /// @notice 测试成功购买 NFT，验证事件和状态
    function test_BuyNFT_Success() public {
        // 上架
        _listNFT(seller, 0, NFT_PRICE);

        uint256 sellerBalanceBefore = token.balanceOf(seller);
        uint256 buyerBalanceBefore = token.balanceOf(buyer);

        vm.startPrank(buyer);
        token.approve(address(market), NFT_PRICE);

        // 验证事件
        vm.expectEmit(true, true, true, true);
        emit NFTSold(seller, buyer, address(nft), 0, NFT_PRICE);

        market.buyNFT(address(nft), 0);
        vm.stopPrank();

        // 验证结果
        assertEq(nft.ownerOf(0), buyer, "Buyer should own NFT");
        assertEq(
            token.balanceOf(seller),
            sellerBalanceBefore + NFT_PRICE,
            "Seller should receive payment"
        );
        assertEq(
            token.balanceOf(buyer),
            buyerBalanceBefore - NFT_PRICE,
            "Buyer should pay"
        );

        NFTMarketOptimized.Listing memory listing = market.getListing(address(nft), 0);
        assertFalse(listing.isActive, "Listing should be inactive");
    }

    /// @notice 测试购买未上架的 NFT 失败
    function test_BuyNFT_Fail_NotListed() public {
        vm.prank(buyer);
        vm.expectRevert(NFTMarketOptimized.NFTNotListed.selector);
        market.buyNFT(address(nft), 0);
    }

    /// @notice 测试购买自己的 NFT 失败
    function test_BuyNFT_Fail_BuyOwnNFT() public {
        // 先给 seller 一些代币
        token.transfer(seller, 200 * 10 ** 18);

        _listNFT(seller, 0, NFT_PRICE);

        vm.startPrank(seller);
        token.approve(address(market), NFT_PRICE);

        vm.expectRevert(NFTMarketOptimized.CannotBuyOwnNFT.selector);
        market.buyNFT(address(nft), 0);
        vm.stopPrank();
    }

    /// @notice 测试重复购买同一 NFT 失败
    function test_BuyNFT_Fail_AlreadySold() public {
        _listNFT(seller, 0, NFT_PRICE);

        // 第一个买家成功购买
        vm.startPrank(buyer);
        token.approve(address(market), NFT_PRICE);
        market.buyNFT(address(nft), 0);
        vm.stopPrank();

        // 第二个买家尝试购买同一个 NFT（应该失败）
        vm.startPrank(buyer2);
        token.approve(address(market), NFT_PRICE);
        vm.expectRevert(NFTMarketOptimized.NFTNotListed.selector);
        market.buyNFT(address(nft), 0);
        vm.stopPrank();
    }

    /// @notice 测试支付代币不足失败
    function test_BuyNFT_Fail_InsufficientPayment() public {
        _listNFT(seller, 0, NFT_PRICE);

        vm.startPrank(buyer);
        // 只授权一半的金额
        token.approve(address(market), NFT_PRICE / 2);

        vm.expectRevert(); // ERC20 转账会失败
        market.buyNFT(address(nft), 0);
        vm.stopPrank();
    }

    /// @notice 测试通过 callback 购买支付过多会退款
    function test_BuyWithCallback_RefundsExcess() public {
        _listNFT(seller, 0, NFT_PRICE);

        uint256 overpayment = 50 * 10 ** 18;
        uint256 buyerBalanceBefore = token.balanceOf(buyer);

        vm.prank(buyer);
        bytes memory data = abi.encode(address(nft), uint256(0));
        token.transferWithCallback(
            address(market),
            NFT_PRICE + overpayment,
            data
        );

        // 验证：买家只花了 NFT_PRICE，多余的退回
        assertEq(
            token.balanceOf(buyer),
            buyerBalanceBefore - NFT_PRICE,
            "Should only pay exact price"
        );
        // 市场合约余额应该为 0
        assertEq(
            token.balanceOf(address(market)),
            0,
            "Market should have no balance"
        );
    }

    /// @notice 测试通过 callback 购买支付不足失败
    function test_BuyWithCallback_Fail_InsufficientPayment() public {
        _listNFT(seller, 0, NFT_PRICE);

        vm.prank(buyer);
        bytes memory data = abi.encode(address(nft), uint256(0));
        vm.expectRevert(NFTMarketOptimized.InsufficientPayment.selector);
        token.transferWithCallback(address(market), NFT_PRICE - 1, data);
    }

    // ==================== 模糊测试 ====================

    /// @notice 模糊测试：随机价格上架和购买
    /// @param priceInTokens 价格（0.01 - 10000 tokens）
    function testFuzz_ListAndBuy_RandomPrice(uint256 priceInTokens) public {
        // 限制价格范围：0.01 到 10000 tokens
        priceInTokens = bound(priceInTokens, 1, 10000);
        uint256 price = priceInTokens * 10 ** 16; // 0.01 token = 10^16 wei

        // 确保 buyer 有足够的代币
        if (token.balanceOf(buyer) < price) {
            token.transfer(buyer, price);
        }

        // 上架
        _listNFT(seller, 0, price);

        // 购买
        vm.startPrank(buyer);
        token.approve(address(market), price);
        market.buyNFT(address(nft), 0);
        vm.stopPrank();

        // 验证
        assertEq(nft.ownerOf(0), buyer, "Buyer should own NFT");
    }

    /// @notice 模糊测试：随机地址购买
    /// @param buyerSeed 用于生成随机买家地址的种子
    function testFuzz_Buy_RandomAddress(uint256 buyerSeed) public {
        // 生成随机买家地址（排除特殊地址）
        address randomBuyer = address(
            uint160(bound(buyerSeed, 1, type(uint160).max))
        );
        vm.assume(randomBuyer != seller);
        vm.assume(randomBuyer != address(0));
        vm.assume(randomBuyer != address(market));
        vm.assume(randomBuyer != address(token));
        vm.assume(randomBuyer != address(nft));

        // 给随机买家分配代币
        token.transfer(randomBuyer, NFT_PRICE);

        // 上架
        _listNFT(seller, 0, NFT_PRICE);

        // 随机买家购买
        vm.startPrank(randomBuyer);
        token.approve(address(market), NFT_PRICE);
        market.buyNFT(address(nft), 0);
        vm.stopPrank();

        // 验证
        assertEq(nft.ownerOf(0), randomBuyer, "Random buyer should own NFT");
    }

    /// @notice 模糊测试：随机价格和随机买家
    /// @param priceInTokens 价格
    /// @param buyerSeed 买家种子
    function testFuzz_ListAndBuy_RandomPriceAndAddress(
        uint256 priceInTokens,
        uint256 buyerSeed
    ) public {
        // 限制价格范围
        priceInTokens = bound(priceInTokens, 1, 10000);
        uint256 price = priceInTokens * 10 ** 16;

        // 生成随机买家
        address randomBuyer = address(
            uint160(bound(buyerSeed, 1, type(uint160).max))
        );
        vm.assume(randomBuyer != seller);
        vm.assume(randomBuyer != address(0));
        vm.assume(randomBuyer != address(market));
        vm.assume(randomBuyer != address(token));
        vm.assume(randomBuyer != address(nft));

        // 给随机买家分配代币
        token.transfer(randomBuyer, price);

        // 上架
        _listNFT(seller, 0, price);

        // 购买
        vm.startPrank(randomBuyer);
        token.approve(address(market), price);
        market.buyNFT(address(nft), 0);
        vm.stopPrank();

        // 验证
        assertEq(nft.ownerOf(0), randomBuyer);
    }

    // ==================== 不变性测试 ====================

    /// @notice 不变性测试：市场合约永远不应该持有代币
    function invariant_MarketHasNoTokenBalance() public view {
        assertEq(
            token.balanceOf(address(market)),
            0,
            "Market should never hold tokens"
        );
    }

    // ==================== 下架测试 ====================

    /// @notice 测试成功下架 NFT
    function test_Delist_Success() public {
        _listNFT(seller, 0, NFT_PRICE);

        vm.prank(seller);
        vm.expectEmit(true, true, true, true);
        emit NFTDelisted(seller, address(nft), 0);
        market.delist(address(nft), 0);

        assertEq(nft.ownerOf(0), seller, "Seller should get NFT back");

        NFTMarketOptimized.Listing memory listing = market.getListing(address(nft), 0);
        assertFalse(listing.isActive, "Listing should be inactive");
    }

    /// @notice 测试非卖家下架失败
    function test_Delist_Fail_NotSeller() public {
        _listNFT(seller, 0, NFT_PRICE);

        vm.prank(buyer);
        vm.expectRevert(NFTMarketOptimized.NotTheSeller.selector);
        market.delist(address(nft), 0);
    }

    // ==================== 辅助函数 ====================

    function _listNFT(
        address _seller,
        uint256 tokenId,
        uint256 price
    ) internal {
        vm.startPrank(_seller);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, price);
        vm.stopPrank();
    }
}

/**
 * @title NFTMarketOptimizedInvariantTest
 * @dev 不变性测试 - 验证市场合约永远不持有代币
 */
contract NFTMarketOptimizedInvariantTest is Test {
    NFTMarketOptimized public market;
    ERC20WithCallbackAndData public token;
    YangmingGardenNFT public nft;
    NFTMarketOptimizedHandler public handler;

    function setUp() public {
        token = new ERC20WithCallbackAndData();
        nft = new YangmingGardenNFT();
        market = new NFTMarketOptimized(address(token), address(this));

        handler = new NFTMarketOptimizedHandler(market, token, nft);

        // 给 handler 分配代币
        token.transfer(address(handler), 100000 * 10 ** 18);

        // 设置目标合约
        targetContract(address(handler));
    }

    /// @notice 不变性：市场合约永远不应该持有代币
    function invariant_MarketNeverHoldsTokens() public view {
        assertEq(
            token.balanceOf(address(market)),
            0,
            "INVARIANT: Market should never hold tokens"
        );
    }
}

/**
 * @title NFTMarketOptimizedHandler
 * @dev 不变性测试的 Handler 合约
 */
contract NFTMarketOptimizedHandler is Test {
    NFTMarketOptimized public market;
    ERC20WithCallbackAndData public token;
    YangmingGardenNFT public nft;

    address[] public actors;
    uint256 public tokenIdCounter;

    constructor(
        NFTMarketOptimized _market,
        ERC20WithCallbackAndData _token,
        YangmingGardenNFT _nft
    ) {
        market = _market;
        token = _token;
        nft = _nft;

        // 创建一些测试用户
        for (uint256 i = 0; i < 5; i++) {
            actors.push(makeAddr(string(abi.encodePacked("actor", i))));
        }
    }

    /// @notice 随机上架 NFT
    function listNFT(uint256 actorIndex, uint256 price) external {
        actorIndex = bound(actorIndex, 0, actors.length - 1);
        price = bound(price, 1 * 10 ** 16, 10000 * 10 ** 18);

        address actor = actors[actorIndex];

        // 铸造新 NFT 给 actor
        uint256 tokenId = tokenIdCounter++;
        nft.safeMint(actor, "ipfs://test");

        // 上架
        vm.startPrank(actor);
        nft.approve(address(market), tokenId);
        market.list(address(nft), tokenId, price);
        vm.stopPrank();
    }

    /// @notice 随机购买 NFT
    function buyNFT(uint256 buyerIndex, uint256 tokenId) external {
        buyerIndex = bound(buyerIndex, 0, actors.length - 1);
        tokenId = bound(
            tokenId,
            0,
            tokenIdCounter > 0 ? tokenIdCounter - 1 : 0
        );

        NFTMarketOptimized.Listing memory listing = market.getListing(
            address(nft),
            tokenId
        );
        if (!listing.isActive) return;

        address buyerAddr = actors[buyerIndex];
        if (buyerAddr == listing.seller) return;

        // 给买家代币
        token.transfer(buyerAddr, listing.price);

        vm.startPrank(buyerAddr);
        token.approve(address(market), listing.price);
        market.buyNFT(address(nft), tokenId);
        vm.stopPrank();
    }
}
