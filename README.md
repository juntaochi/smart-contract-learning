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
