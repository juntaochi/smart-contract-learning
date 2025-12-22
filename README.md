# Foundry Project

This repo is set up to use Foundry (`forge`, `cast`, `anvil`) for compiling and testing Solidity.

## Layout

- Solidity sources live in `contracts/` (configured as `src` in `foundry.toml`).
- Forge tests live in `test/`.
- Build output goes to `out/` (gitignored).

## Commands

- Build: `forge build`
- Test: `forge test`
- Format: `forge fmt`
- Local chain: `anvil`

## Bank demo flow

1. Deploy `BigBank` and `Admin`. `BigBank` starts with the deployer as admin; `Admin` starts with the deployer as owner.
2. Call `transferAdmin` on `BigBank`, passing the deployed `Admin` contract address so `Admin` becomes the bank admin.
3. Have users call `deposit()` or send ETH directly to `BigBank` (each deposit must be at least `0.001 ether`).
4. The `Admin` owner calls `adminWithdraw(BigBank)` to pull all funds from `BigBank` into the `Admin` contract.
5. The `Admin` owner can finally call `withdrawToOwner()` to move the funds from `Admin` to their own EOA.

## Deploy (example)

With `SEPOLIA_RPC_URL` and `PRIVATE_KEY` set in your environment:

- Deploy: `forge create --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY contracts/bank.sol:BigBank`

## NFT Market Listener

A backend service to listen for `NFTListed` and `NFTSold` events.

### Usage

1. **Start Local Chain**:
   ```bash
   anvil
   ```

2. **Deploy Contracts**:
   ```bash
   forge script script/DeployNFTMarket.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --unlocked --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   ```

3. **Start Listener**:
   ```bash
   npm run listener
   ```
