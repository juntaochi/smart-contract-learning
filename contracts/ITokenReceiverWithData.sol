// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev 扩展的代币接收者接口，支持额外数据参数
 * 用于 NFTMarket 等需要传递额外信息的场景
 */
interface ITokenReceiverWithData {
    /**
     * @dev 当合约接收到代币时被调用
     * @param from 代币发送者地址
     * @param amount 接收的代币数量
     * @param data 额外数据（如 NFT tokenId）
     * @return 返回 true 表示成功接收
     */
    function tokensReceived(
        address from,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);
}
