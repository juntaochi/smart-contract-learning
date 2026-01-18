# Upgradeable NFT Marketplace

This repository contains an upgradeable NFT marketplace implementation using OpenZeppelin's UUPS proxy pattern.

## Project Structure

```text
contracts/
├── NFTMarketV1.sol          # V1 implementation: basic marketplace
├── NFTMarketV2.sol          # V2 implementation: adds signature listing
├── JacToken.sol             # ERC20 payment token
└── JacNFT.sol               # ERC721 test NFT

test/
└── NFTMarketUpgradeTest.t.sol   # Comprehensive test suite (10 tests, all passing)

script/
├── DeployNFTMarketUpgradeable.s.sol  # V1 + Proxy deployment
└── UpgradeToV2.s.sol                 # V2 upgrade script
```

## Features

### V1 (Basic Marketplace)

- ✅ List NFTs for sale with ERC20 tokens
- ✅ Buy listed NFTs
- ✅ Delist NFTs (seller only)
- ✅ Fully upgradeable via UUPS proxy

### V2 (Signature-Based Listing)

- ✅ All V1 features (backward compatible)
- ✅ **NEW**: List NFTs using offline signatures (EIP-712)
- ✅ **NEW**: One-time `setApprovalForAll`, then gas-free listing
- ✅ **NEW**: Nonce-based replay protection
- ✅ State preservation from V1

## Test Results

All 10 tests passing ✓

```text
Ran 10 tests for test/NFTMarketUpgradeTest.t.sol:NFTMarketUpgradeTest
[PASS] testUpgrade_StatePreservation() (gas: 2174441)
[PASS] testV1_BuyNFT() (gas: 258024)
[PASS] testV1_CannotBuyOwnNFT() (gas: 264350)
[PASS] testV1_Delist() (gas: 217739)
[PASS] testV1_Initialize() (gas: 25182)
[PASS] testV1_List() (gas: 209633)
[PASS] testV2_ExpiredSignature() (gas: 1866727)
[PASS] testV2_InvalidSignature() (gas: 1875238)
[PASS] testV2_ListWithSignature() (gas: 2010243)
[PASS] testV2_SignatureReplayProtection() (gas: 2074002)

Suite result: ok. 10 passed; 0 failed; 0 skipped; finished in 2.58ms (5.24ms CPU time)
```

Full logs: [upgradeable-nft-market-test-logs.txt](upgradeable-nft-market-test-logs.txt)

## Deployment Guide

### Prerequisites

```bash
# Install dependencies
forge install

# Set up environment variables
cp .env.example .env
# Edit .env with your keys:
# SEPOLIA_RPC_URL=...
# PRIVATE_KEY=...
# ETHERSCAN_API_KEY=...
```

### Deploy to Sepolia

#### 1. Deploy V1 with Proxy

```bash
forge script script/DeployNFTMarketUpgradeable.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

#### 2. Upgrade to V2

```bash
export PROXY_ADDRESS=<your_proxy_from_step_1>
forge script script/UpgradeToV2.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## Deployed Contracts (Sepolia)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| **Proxy** (Main Contract) | `0xa30d13219A1Ba963ae9e3C5bf85B166aA1F21E25` | [View →](https://sepolia.etherscan.io/address/0xa30d13219A1Ba963ae9e3C5bf85B166aA1F21E25) |
| V1 Implementation | `0x0d9bDb744587f0A8fD2786f669E16eF21CFb66C0` | [View →](https://sepolia.etherscan.io/address/0x0d9bDb744587f0A8fD2786f669E16eF21CFb66C0) |
| V2 Implementation | `0x22c54fd67828af4b590a432054ca24f055b253f2` | [View →](https://sepolia.etherscan.io/address/0x22c54fd67828af4b590a432054ca24f055b253f2) |
| Payment Token (ERC20) | `0xd5a5187a85e81cc3ede9bf2f0234d991ea3621b8` | [View →](https://sepolia.etherscan.io/address/0xd5a5187a85e81cc3ede9bf2f0234d991ea3621b8) |
| Test NFT (ERC721) | `0xaca1d6454f7e45b1c766d3af13d4531cf3908cfa` | [View →](https://sepolia.etherscan.io/address/0xaca1d6454f7e45b1c766d3af13d4531cf3908cfa) |

## Usage

### V1: Standard Listing

```solidity
// 1. Approve NFT
nft.approve(marketAddress, tokenId);

// 2. List NFT
market.list(nftAddress, tokenId, price);

// 3. Buy NFT
paymentToken.approve(marketAddress, price);
market.buyNFT(nftAddress, tokenId);
```

### V2: Signature Listing

```solidity
// 1. One-time approval
nft.setApprovalForAll(marketAddress, true);

// 2. Generate signature offline (no gas!)
bytes32 digest = /* EIP-712 signature */;
(v, r, s) = sign(digest);

// 3. Anyone can submit signature
market.listWithSignature(nftAddress, tokenId, price, deadline, seller, v, r, s);
```

## Architecture

### UUPS Proxy Pattern

```
User
 ↓
Proxy (0x...) ←────── Your main contract address
 ↓ delegatecall
Implementation V1 (0x...)  →  upgradeTo()  →  Implementation V2 (0x...)
```

### Storage Layout

```solidity
// V1
Slot 50: paymentToken
Slot 51: listings

// V2 (extends V1)
Slot 50: paymentToken     ← preserved
Slot 51: listings         ← preserved
Slot 52: nonces           ← new
Slot 53: _DOMAIN_SEPARATOR ← new
```

## Security

- ✅ UUPS proxy for upgradeability
- ✅ Owner-only upgrades
- ✅ EIP-712 structured signatures
- ✅ Nonce-based replay protection
- ✅ Storage layout preservation
- ✅ Comprehensive test coverage

## Development

```bash
# Build
forge build

# Test
forge test

# Test with verbosity
forge test -vvv

# Gas report
forge test --gas-report

# Coverage
forge coverage
```

## License

MIT

