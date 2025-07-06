# ZK Guess Circuits

Zero-knowledge circuits that prove knowledge of a secret number without revealing it.

## Circuit

```circom
template GuessNumber() {
    signal input number;      // Private: secret number (1-100)
    signal input salt;        // Private: randomness
    signal input guess;       // Public: player's guess
    
    signal output commitment; // Poseidon(number, salt)
    signal output isCorrect;  // 1 if correct, 0 if not
}
```

## Quick Start

```bash
# Install dependencies
bun install

# Build everything (compile + trusted setup)
bun run build

# Run tests
bun test

# Copy artifacts to contracts repo
bun run copy-to-contracts
```

## Performance

- **Proof size**: ~256 bytes (fits in a tweet!)
- **Generation time**: 2-5 seconds on mobile
- **Verification gas**: ~300k

## Build Artifacts

- `generated/guess.wasm` - Browser proof generation
- `generated/guess_final.zkey` - Proving key
- `generated/GuessVerifier.sol` - Solidity verifier

## License

MIT
