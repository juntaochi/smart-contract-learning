// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/TokenBankUnified.sol";

/**
 * @title DeployTokenBankUnified
 * @dev 部署 TokenBankUnified 合约
 *
 * 使用方法:
 * forge script script/DeployTokenBankUnified.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
 */
contract DeployTokenBankUnified is Script {
    // Permit2 官方合约地址（所有网络相同）
    address constant PERMIT2_ADDRESS =
        0x000000000022D473030F116dDEE9F6B43aC78BA3;

    // 已部署的代币地址
    address constant JAC_TOKEN = 0x43FcFF4c6093C50E09376609b06E156CB5984E00;
    address constant ERC20_TOKEN = 0x132d8A7b73e62094fF6Fa73F3f7d1B8d76467DC2;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 部署 TokenBankUnified for JAC Token
        TokenBankUnified bankJAC = new TokenBankUnified(
            JAC_TOKEN,
            PERMIT2_ADDRESS
        );
        console.log("TokenBankUnified (JAC) deployed at:", address(bankJAC));

        // 部署 TokenBankUnified for ERC20 Token
        TokenBankUnified bankERC20 = new TokenBankUnified(
            ERC20_TOKEN,
            PERMIT2_ADDRESS
        );
        console.log(
            "TokenBankUnified (ERC20) deployed at:",
            address(bankERC20)
        );

        // 输出配置信息
        console.log("\n=== Frontend Configuration ===");
        console.log("BANKS.UNIFIED_JAC:", address(bankJAC));
        console.log("BANKS.UNIFIED_ERC20:", address(bankERC20));
        console.log("PERMIT2_ADDRESS:", PERMIT2_ADDRESS);

        vm.stopBroadcast();
    }
}
