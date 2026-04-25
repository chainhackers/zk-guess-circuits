# ZK Guess Circuits

Zero-knowledge circuits that prove knowledge of a secret number without revealing it. Source of truth: [`circuits/guess.circom`](circuits/guess.circom).

## Quick Start

```bash
# Install dependencies
bun install

# Build everything (compile + dev setup)
bun run build

# Run tests
bun run test

# Copy artifacts to contracts repo (requires contracts repo in sibling directory)
bun run copy-to-contracts
```

## Trusted setup

`bun run build` runs a single-contributor dev setup, suitable for tests and local dev only. Production deployments use a multi-party phase-2 ceremony — see [CEREMONY.md](CEREMONY.md).

## Repository Structure

This repository should be placed as a sibling to the contracts and frontend repos:

```
parent-directory/
├── zk-guess-circuits/    # This repository
├── zk-guess-contracts/   # Solidity verifier + on-chain logic
└── zk-guess/frontend/    # Browser proof generation
```

## Performance

- **Proof size**: ~256 bytes (fits in a tweet!)
- **Generation time**: 2-5 seconds on mobile
- **Verification gas**: ~300k

## Build Artifacts

- `generated/guess.wasm` — browser proof generation
- `generated/guess_dev.zkey` — dev proving key (single-contributor; not for production)
- `generated/guess_final.zkey` — ceremony proving key (produced by phase-2 ceremony, see [CEREMONY.md](CEREMONY.md))
- `generated/GuessVerifier.sol` — Solidity verifier

## License

MIT
