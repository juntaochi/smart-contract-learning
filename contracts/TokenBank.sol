// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenBank {
    // 接受的 ERC20 代币合约地址
    IERC20 public token;

    // 记录每个地址的存款数量
    mapping(address => uint256) public deposits;

    // 事件
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    constructor(address _token) {
        require(
            _token != address(0),
            "TokenBank: token address cannot be zero"
        );
        token = IERC20(_token);
    }

    /**
     * @dev 存入代币
     * @param amount 存入的代币数量
     * 注意：用户需要先调用 token.approve(address(this), amount) 授权 TokenBank 合约
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "TokenBank: deposit amount must be greater than 0");

        // 从用户地址转移代币到 TokenBank
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "TokenBank: transfer failed");

        // 更新用户的存款记录
        deposits[msg.sender] += amount;

        emit Deposit(msg.sender, amount);
    }

    /**
     * @dev 提取代币
     * @param amount 提取的代币数量
     */
    function withdraw(uint256 amount) external {
        require(
            amount > 0,
            "TokenBank: withdraw amount must be greater than 0"
        );
        require(
            deposits[msg.sender] >= amount,
            "TokenBank: insufficient balance"
        );

        // 更新用户的存款记录
        deposits[msg.sender] -= amount;

        // 将代币转回用户地址
        bool success = token.transfer(msg.sender, amount);
        require(success, "TokenBank: transfer failed");

        emit Withdraw(msg.sender, amount);
    }

    /**
     * @dev 查询用户的存款余额
     * @param account 用户地址
     * @return 用户的存款余额
     */
    function balanceOf(address account) external view returns (uint256) {
        return deposits[account];
    }
}
