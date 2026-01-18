// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/NFTMarketV1.sol";
import "../contracts/JacToken.sol";
import "../contracts/JacNFT.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployNFTMarketUpgradeable
 * @dev Deploy upgradeable NFT marketplace V1 with proxy
 */
contract DeployNFTMarketUpgradeable is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("\n================================");
        console.log("Deploying Upgradeable NFT Market");
        console.log("================================\n");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("\n");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy payment token (or use existing)
        JacToken paymentToken = new JacToken();
        console.log("Payment Token deployed:", address(paymentToken));

        // 2. Deploy test NFT (or use existing)
        JacNFT testNFT = new JacNFT();
        console.log("Test NFT deployed:", address(testNFT));

        // 3. Deploy NFTMarketV1 implementation
        NFTMarketV1 implementationV1 = new NFTMarketV1();
        console.log("NFTMarketV1 Implementation:", address(implementationV1));

        // 4. Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            NFTMarketV1.initialize.selector,
            address(paymentToken)
        );

        // 5. Deploy ERC1967Proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementationV1),
            initData
        );
        console.log("Proxy deployed:", address(proxy));

        vm.stopBroadcast();

        // Display summary
        console.log("\n================================");
        console.log("Deployment Summary");
        console.log("================================");
        console.log("Payment Token:", address(paymentToken));
        console.log("Test NFT:", address(testNFT));
        console.log("Proxy:", address(proxy));
        console.log("V1 Implementation:", address(implementationV1));
        console.log("Market Owner:", deployer);
        console.log("\n");

        // Verify market is functional
        NFTMarketV1 market = NFTMarketV1(address(proxy));
        console.log("Market version:", market.version());
        console.log("Market payment token:", address(market.paymentToken()));
        console.log("Market owner:", market.owner());
        
        console.log("\n================================");
        console.log("Next Steps:");
        console.log("================================");
        console.log("1. Verify contracts on Etherscan:");
        console.log("   forge verify-contract", address(implementationV1), "contracts/NFTMarketV1.sol:NFTMarketV1");
        console.log("   forge verify-contract", address(proxy), "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy");
        console.log("\n2. To upgrade to V2, run:");
        console.log("   forge script script/UpgradeToV2.s.sol --broadcast");
        console.log("\n");
    }
}
