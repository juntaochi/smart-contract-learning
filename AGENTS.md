# Repository Guidelines

## Project Structure & Module Organization
- `contracts/`: Solidity sources (`Bank`, `Admin`, `Storage`, `Ballot`, `Counter`); keep contracts PascalCase and group related logic only.
- `test/`: Forge tests (`*.t.sol`), mirror contract names.
- Generated: `out/`, `cache/`, `broadcast/` are build outputs—do not edit or commit.
- `foundry.toml` defines compiler + paths; secrets flow from `.env` (gitignored).

## Build, Test, and Development Commands
- `forge build` compiles to `out/`.
- `forge test` runs Forge Solidity tests on the in-memory EVM.
- `anvil` starts a local chain.
- `forge create` deploys contracts (supports `--rpc-url` and `--private-key`).

## Coding Style & Naming Conventions
- Solidity: `^0.8.x`, 4-space indent, PascalCase contracts, camelCase functions/state, ALL_CAPS constants, and clear `require` messages; prefer NatSpec on public/external methods.

## Testing Guidelines
- Place unit specs in `test/*.t.sol`.
- Cover success and revert paths; prefer clear `require` messages.
- For integrations, run `anvil` and aim `forge create`/`cast` at `localhost`.

## Commit & Pull Request Guidelines
- Use imperative, conventional-style commits (`feat: add bank minimum deposit check`, `fix: guard admin transfer`). Keep subjects under ~72 chars.
- PRs should state the problem, the solution, and tests run (`forge test`). Note network targets, new env vars, and any deployed addresses or key console output; request review after checks pass.

## Security & Configuration Notes
- `.env` (gitignored) should provide `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, and `ETHERSCAN_API_KEY`; keep keys scoped and never commit them. Example:
```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<projectId>
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=<key>
```
- Use test accounts on public nets, double-check admin/owner addresses before deployment, and avoid logging secrets in scripts.
