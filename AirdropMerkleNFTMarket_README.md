# AirdropMerkleNFTMarket - Usage Guide

## Overview

AirdropMerkleNFTMarket is an NFT marketplace contract that uses Merkle tree whitelist verification to offer 50% discounts to whitelisted users. It supports gasless token approvals via ERC20 permit and atomic transactions via multicall.

## Quick Start

### 1. Build Your Whitelist

```solidity
address[] memory whitelist = new address[](3);
whitelist[0] = 0xWhitelistedAddress1;
whitelist[1] = 0xWhitelistedAddress2;
whitelist[2] = 0xWhitelistedAddress3;

bytes32 merkleRoot = MerkleTreeBuilder.getRoot(whitelist);
```

### 2. Deploy the Market

```solidity
AirdropMerkleNFTMarket market = new AirdropMerkleNFTMarket(
    address(paymentToken),  // Must support ERC20Permit
    merkleRoot
);
```

### 3. List an NFT

```solidity
nft.approve(address(market), tokenId);
market.list(address(nft), tokenId, 100 * 10**18); // Full price: 100 tokens
// Whitelisted users pay: 50 tokens (50% discount)
```

### 4. Claim NFT (Two Methods)

#### Method A: Multicall (Atomic Permit + Claim)

**Recommended for best UX - one transaction, no pre-approval needed**

```solidity
// 1. Generate permit signature
uint256 deadline = block.timestamp + 1 hours;
uint256 discountedPrice = 50 * 10**18;
(uint8 v, bytes32 r, bytes32 s) = getPermitSignature(...);

// 2. Get Merkle proof for buyer
bytes32[] memory proof = MerkleTreeBuilder.getProof(whitelist, buyerIndex);

// 3. Build multicall
bytes[] memory calls = new bytes[](2);
calls[0] = abi.encodeWithSignature(
    "permitPrePay(address,address,uint256,uint256,uint8,bytes32,bytes32)",
    buyer, address(market), discountedPrice, deadline, v, r, s
);
calls[1] = abi.encodeWithSignature(
    "claimNFT(address,uint256,bytes32[])",
    address(nft), tokenId, proof
);

// 4. Execute in one transaction
market.multicall(calls);
```

#### Method B: Direct Claim (Pre-approved Tokens)

```solidity
// 1. Approve tokens (separate transaction)
token.approve(address(market), discountedPrice);

// 2. Get Merkle proof
bytes32[] memory proof = MerkleTreeBuilder.getProof(whitelist, buyerIndex);

// 3. Claim NFT
market.claimNFT(address(nft), tokenId, proof);
```

## Contract Functions

### Marketplace Functions

```solidity
// List an NFT for sale
function list(address nftContract, uint256 tokenId, uint256 price) external

// Remove NFT from sale
function delist(address nftContract, uint256 tokenId) external

// View listing details
function getListing(address nftContract, uint256 tokenId) external view returns (Listing)

// Calculate discounted price
function getDiscountedPrice(address nftContract, uint256 tokenId) external view returns (uint256)
```

### Permit & Claim Functions

```solidity
// Set token allowance via permit signature
function permitPrePay(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) public

// Claim NFT with whitelist proof (50% discount)
function claimNFT(
    address nftContract,
    uint256 tokenId,
    bytes32[] calldata merkleProof
) public

// Execute multiple calls atomically
function multicall(bytes[] calldata data) external returns (bytes[])
```

## Merkle Tree Utilities

```solidity
// Build Merkle root from addresses
bytes32 root = MerkleTreeBuilder.getRoot(whitelist);

// Generate proof for specific address
bytes32[] memory proof = MerkleTreeBuilder.getProof(whitelist, index);

// Verify proof (internal, but available for testing)
bool valid = MerkleTreeBuilder.verify(proof, root, leaf);
```

## Testing

Run all tests:

```bash
forge test --match-contract AirdropMerkleNFTMarketTest -vvv
```

Run specific test:

```bash
forge test --match-test testMulticallPermitAndClaim -vvvv
```

## Security Features

✅ **Merkle Proof Verification**: Only whitelisted addresses can claim discounted NFTs  
✅ **Atomic Transactions**: Multicall ensures permit + claim succeed or fail together  
✅ **EIP-2612 Permit**: Gasless token approvals via signatures  
✅ **50% Discount Enforcement**: Discount automatically calculated and enforced on-chain  

## Files

- **Contract**: `contracts/AirdropMerkleNFTMarket.sol`
- **Merkle Utils**: `script/MerkleTreeBuilder.sol`
- **Multicall Helper**: `script/MulticallHelper.sol`
- **Tests**: `test/AirdropMerkleNFTMarket.t.sol`
- **Deploy Script**: `script/DeployAirdropMarket.s.sol`

## Example: Complete Flow

See `test/AirdropMerkleNFTMarket.t.sol::testMulticallPermitAndClaim` for a complete end-to-end example.
