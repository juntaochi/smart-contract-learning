# Sample Hardhat 3 Beta Project (minimal)

This project has a minimal setup of Hardhat 3 Beta, without any plugins.

## What's included?

The project includes native support for TypeScript, Hardhat scripts, tasks, and support for Solidity compilation and tests.

## Bank demo flow

1. Deploy `BigBank` and `Admin`. `BigBank` starts with the deployer as admin; `Admin` starts with the deployer as owner.
2. Call `transferAdmin` on `BigBank`, passing the deployed `Admin` contract address so `Admin` becomes the bank admin.
3. Have users call `deposit()` or send ETH directly to `BigBank` (each deposit must be at least `0.001 ether`).
4. The `Admin` owner calls `adminWithdraw(BigBank)` to pull all funds from `BigBank` into the `Admin` contract.
5. The `Admin` owner can finally call `withdrawToOwner()` to move the funds from `Admin` to their own EOA.
