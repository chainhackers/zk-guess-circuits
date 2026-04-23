# Trusted-setup v2 (phase-2 ceremony)

Part of the `v2` circuit redesign. Sibling plan: `zk-guess-contracts/docs/superpowers/specs/2026-04-23-clean-redeploy-antimixer-design.md`.

## Goal

Run a fresh phase-2 contribution ceremony for the v2 circuit. The resulting `.zkey` and `verification_key.json` are what the new `GuessVerifier.sol` is generated from. Even if the circuit changes were zero, the new ceremony produces an entirely different verifier contract (different `IC[]`, different α/β/γ/δ constants, different bytecode) — which by itself breaks any bytecode-similarity cluster the old verifier was sitting in.

Because we *are* changing the circuit (puzzleId binding + guess range + domain-separated commitment ± guesser binding), the ceremony runs against the new R1CS.

## Prerequisites

- v2 circuit is final: `bind-puzzle-id.md`, `range-check-guess.md`, `domain-separate-commitment.md` tasks merged (and `bind-guesser.md` decided one way or another).
- Phase-1 `.ptau` file: reuse the existing `powersOfTau28_hez_final_14.ptau` (or bump to `_15` if the circuit grew past 2^14 constraints). Phase 1 is universal; no need to redo.

## Ceremony procedure

1. Compile the v2 circuit:
   ```bash
   circom circuits/guess.circom --r1cs --wasm --sym -o build/v2/
   ```

2. Groth16 phase-2 setup from phase-1 ptau:
   ```bash
   snarkjs groth16 setup build/v2/guess.r1cs <path-to-ptau> build/v2/guess_0000.zkey
   ```

3. **Multiple independent contributions.** Minimum 3 contributors; more is better. Each runs:
   ```bash
   snarkjs zkey contribute build/v2/guess_NNNN.zkey build/v2/guess_MMMM.zkey \
     --name="contributor-<handle>" -e="<entropy-source-notes>"
   ```
   Each contributor should:
   - Use a fresh machine or one they trust.
   - Use a high-entropy string (system RNG + a user-typed passphrase + a live news headline works).
   - Publish a SHA-256 attestation of their output `.zkey` on a public channel (Farcaster, Twitter, GitHub issue) with their contribution index and a signed message from their known identity.

4. Apply a random beacon at the end:
   ```bash
   snarkjs zkey beacon build/v2/guess_NNNN.zkey build/v2/guess_final.zkey \
     <32-byte-hex-from-drand-or-bitcoin-block-hash> 10 \
     -n="v2 final beacon"
   ```
   Document the beacon source (e.g., Bitcoin block `N` hash on date `D`) so it can be audited.

5. Export verification key and Solidity verifier:
   ```bash
   snarkjs zkey export verificationkey build/v2/guess_final.zkey build/v2/verification_key.json
   snarkjs zkey export solidityverifier build/v2/guess_final.zkey build/v2/Groth16Verifier.sol
   ```

6. Copy artifacts into their consumers:
   - `build/v2/verification_key.json` → commit to circuits repo under `generated/v2/`
   - `build/v2/Groth16Verifier.sol` → copy to `zk-guess-contracts/src/generated/GuessVerifier.sol` (rename contract if needed; current `bun run copy-to-contracts` script in circuits repo handles this).

## Trust assumptions

The ceremony is secure as long as **at least one** contributor destroys their entropy (standard phase-2 property). Document this assumption in `SECURITY.md` and the Blockaid submission.

## Tests

- **Consistency**: `snarkjs groth16 prove` with the final `.zkey` produces a proof; `snarkjs groth16 verify` with the exported `verification_key.json` accepts it.
- **Cross-check**: generate a proof, submit to a local Anvil instance with the generated `GuessVerifier.sol` deployed; `verifyProof` returns `true`.
- **Attestation check**: each contributor's claimed transcript hash matches the actual zkey file's SHA-256.

## Acceptance

- ≥3 independent contributions + 1 beacon.
- Final `.zkey` + `verification_key.json` committed to circuits repo.
- Generated `GuessVerifier.sol` bytecode-diffs from v1 (sanity: contract size is similar but every constant differs).
- Contribution attestations published on GitHub as a ceremony transcript (one file per contributor).
- Ready for artifact release (next task: `publish-artifacts-release.md`).
