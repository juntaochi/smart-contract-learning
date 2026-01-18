// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/NFTMarketV1.sol";
import "../contracts/NFTMarketV2.sol";

/**
 * @title UpgradeToV2
 * @dev Upgrade NFT marketplace from V1 to V2
 */
contract UpgradeToV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Get proxy address from environment or use default
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");

        console.log("\n================================");
        console.log("Upgrading NFT Market to V2");
        console.log("================================\n");
        console.log("Upgrader:", deployer);
        console.log("Proxy:", proxyAddress);
        console.log("Chain ID:", block.chainid);
        console.log("\n");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy NFTMarketV2 implementation
        NFTMarketV2 implementationV2 = new NFTMarketV2();
        console.log("NFTMarketV2 Implementation deployed:", address(implementationV2));

        // 2. Get reference to proxy as V1
        NFTMarketV1 market = NFTMarketV1(proxyAddress);
        
        // 3. Verify we're the owner
        require(market.owner() == deployer, "Not the owner");
        console.log("Owner verified:", deployer);

        // 4. Read state before upgrade
        console.log("\n--- State Before Upgrade ---");
        console.log("Version:", market.version());
        console.log("Payment Token:", address(market.paymentToken()));

        // 5. Upgrade to V2 with initialization
        bytes memory initData = abi.encodeWithSelector(
            NFTMarketV2.initializeV2.selector
        );
        
        market.upgradeToAndCall(address(implementationV2), initData);
        console.log("Upgrade completed!");

        // 6. Cast to V2 and verify
        NFTMarketV2 marketV2 = NFTMarketV2(proxyAddress);
        
        console.log("\n--- State After Upgrade ---");
        console.log("Version:", marketV2.version());
        console.log("Payment Token:", address(marketV2.paymentToken()));
        console.log("Domain Separator:", vm.toString(marketV2.DOMAIN_SEPARATOR()));
        console.log("Listing TypeHash:", vm.toString(marketV2.LISTING_TYPEHASH()));

        vm.stopBroadcast();

        console.log("\n================================");
        console.log("Upgrade Summary");
        console.log("================================");
        console.log("Proxy:", proxyAddress);
        console.log("V1 Implementation: (old)");
        console.log("V2 Implementation:", address(implementationV2));
        console.log("\n");

        console.log("================================");
        console.log("Next Steps:");
        console.log("================================");
        console.log("1. Verify V2 implementation on Etherscan:");
        console.log("   forge verify-contract", address(implementationV2), "contracts/NFTMarketV2.sol:NFTMarketV2");
        console.log("\n2. Test V2 features:");
        console.log("   - Users can now use setApprovalForAll");
        console.log("   - NFTs can be listed via offline signatures");
        console.log("   - All V1 listings remain intact");
        console.log("\n");
    }
}
