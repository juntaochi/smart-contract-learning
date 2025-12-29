// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ITokenReceiver.sol";
import "./IPermit2.sol";

/**
 * @title TokenBankUnified
 * @dev 全能代币银行 - 支持所有存款方式
 *
 * 支持的存款方式：
 * 1. deposit(amount) - 传统方式（需先 approve）
 * 2. tokensReceived(from, amount) - Callback 方式（transferWithCallback）
 * 3. permitDeposit(amount, deadline, v, r, s) - EIP-2612 Permit
 * 4. depositWithPermit2(permit, owner, signature) - Permit2
 *
 * 特性：
 * - 单一代币绑定
 * - ReentrancyGuard 防重入
 * - 事件区分不同存款方式
 */
contract TokenBankUnified is ReentrancyGuard, ITokenReceiver {
    using SafeERC20 for IERC20;

    // Custom errors
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientBalance();
    error InvalidToken();
    error InvalidCaller();

    // State variables
    IERC20 public immutable token;
    IPermit2 public immutable permit2;
    mapping(address => uint256) public deposits;

    // Events
    event Deposit(address indexed user, uint256 amount);
    event CallbackDeposit(address indexed user, uint256 amount);
    event PermitDeposit(address indexed user, uint256 amount);
    event Permit2Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    /**
     * @dev Constructor
     * @param _token Address of the ERC20 token
     * @param _permit2 Address of the Permit2 contract
     */
    constructor(address _token, address _permit2) {
        if (_token == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        // Permit2 can be zero address if not using Permit2
        permit2 = IPermit2(_permit2);
    }

    // ============================================
    // 方式 1: 传统存款 (approve + deposit)
    // ============================================

    /**
     * @dev 传统存款，需要用户先调用 token.approve()
     * @param amount 存款金额
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        token.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;

        emit Deposit(msg.sender, amount);
    }

    // ============================================
    // 方式 2: Callback 存款 (transferWithCallback)
    // ============================================

    /**
     * @dev 实现 ITokenReceiver 接口，接收 transferWithCallback 回调
     * @param from 存款人地址
     * @param amount 存款金额
     */
    function tokensReceived(
        address from,
        uint256 amount
    ) external override returns (bool) {
        if (msg.sender != address(token)) revert InvalidCaller();
        if (amount == 0) revert ZeroAmount();

        deposits[from] += amount;
        emit CallbackDeposit(from, amount);

        return true;
    }

    // ============================================
    // 方式 3: EIP-2612 Permit 存款
    // ============================================

    /**
     * @dev 使用 EIP-2612 Permit 签名存款
     * 代币必须支持 ERC20Permit 扩展
     * @param amount 存款金额
     * @param deadline 签名过期时间
     * @param v 签名参数
     * @param r 签名参数
     * @param s 签名参数
     */
    function permitDeposit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        // 调用代币的 permit 函数进行授权
        IERC20Permit(address(token)).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        // 转账
        token.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;

        emit PermitDeposit(msg.sender, amount);
    }

    // ============================================
    // 方式 4: Permit2 存款
    // ============================================

    /**
     * @dev 使用 Permit2 签名存款
     * 需要用户先一次性授权代币给 Permit2 合约
     * @param permitTransfer Permit2 签名数据
     * @param owner 代币所有者（签名者）
     * @param signature EIP-712 签名
     */
    function depositWithPermit2(
        IPermit2.PermitTransferFrom calldata permitTransfer,
        address owner,
        bytes calldata signature
    ) external nonReentrant {
        if (address(permit2) == address(0)) revert ZeroAddress();
        if (permitTransfer.permitted.amount == 0) revert ZeroAmount();
        if (permitTransfer.permitted.token != address(token))
            revert InvalidToken();

        // 使用 Permit2 转账
        IPermit2.SignatureTransferDetails memory transferDetails = IPermit2
            .SignatureTransferDetails({
                to: address(this),
                requestedAmount: permitTransfer.permitted.amount
            });

        permit2.permitTransferFrom(
            permitTransfer,
            transferDetails,
            owner,
            signature
        );

        deposits[owner] += permitTransfer.permitted.amount;
        emit Permit2Deposit(owner, permitTransfer.permitted.amount);
    }

    // ============================================
    // 提款
    // ============================================

    /**
     * @dev 提款
     * @param amount 提款金额
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (deposits[msg.sender] < amount) revert InsufficientBalance();

        deposits[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    // ============================================
    // View functions
    // ============================================

    /**
     * @dev 查询用户存款余额
     */
    function balanceOf(address account) external view returns (uint256) {
        return deposits[account];
    }

    /**
     * @dev 检查是否支持 Permit2
     */
    function supportsPermit2() external view returns (bool) {
        return address(permit2) != address(0);
    }
}
