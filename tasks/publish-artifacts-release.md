# Publish circuit artifacts as a GitHub Release

Part of the `v2` circuit redesign. Sibling plan: `zk-guess-contracts/docs/superpowers/specs/2026-04-23-clean-redeploy-antimixer-design.md`.

## Goal

Host the final v2 circuit artifacts as a pinned, checksummed GitHub Release at `chainhackers/zk-guess-circuits/releases/tag/v2.0.0`. A scanner or auditor who reads the `@custom:circuit-repo` tag on the contract should be one click away from reproducible proof that the on-chain verifier matches the claimed circuit.

This is the single strongest legitimacy marker we can ship without engaging a paid audit: *"Here is the circuit source, here is the R1CS, here is the trusted-setup transcript, here is the verifying key, here are checksums. Generate a proof yourself and check."*

## Release contents

Attach these artifacts to the Release:

| File | Purpose | Source |
|---|---|---|
| `guess.circom` | Human-readable circuit source | `circuits/guess.circom` at the release tag |
| `guess.r1cs` | Rank-1 constraint system, machine-readable | `build/v2/guess.r1cs` |
| `guess.wasm` | Witness generator | `build/v2/guess.wasm` |
| `guess_final.zkey` | Proving key post-ceremony | `build/v2/guess_final.zkey` |
| `verification_key.json` | Public verifying key | `build/v2/verification_key.json` |
| `GuessVerifier.sol` | Generated Solidity verifier (same file deployed on-chain) | `build/v2/Groth16Verifier.sol` |
| `ceremony/` | Contribution transcripts | one file per contributor |
| `MANIFEST.sha256` | SHA-256 of every other file in the release | generated at packaging time |

## Generating MANIFEST.sha256

```bash
cd release-staging/
sha256sum guess.circom guess.r1cs guess.wasm guess_final.zkey verification_key.json GuessVerifier.sol > MANIFEST.sha256
```

## Cross-linking

- `zk-guess-contracts/src/GuessGame.sol` NatSpec gets `@custom:circuit-repo https://github.com/chainhackers/zk-guess-circuits/releases/tag/v2.0.0`
- `zk-guess-contracts/README.md` links to the Release from its "Verifier" section
- `SECURITY.md` references the release URL and MANIFEST checksum for the `GuessVerifier.sol` that's deployed
- Project homepage (`zk-guess.chainhackers.xyz`) links to the release

## Release body (markdown)

Something like:

> # zk-guess circuits v2.0.0
>
> New circuit with: puzzleId binding, guess range-check, domain-separated commitment, [guesser binding — if shipped].
>
> **Trusted setup**: phase-2 ceremony with 3 contributors + drand beacon. See `ceremony/` in this release for per-contributor transcripts and entropy attestations.
>
> **On-chain verifier**: `chainhackers/zk-guess-contracts` v2 uses the `GuessVerifier.sol` in this release verbatim. SHA-256 in MANIFEST.sha256 matches the deployed bytecode's source.
>
> **Reproducibility**: `snarkjs groth16 setup guess.r1cs <ptau> guess_final.zkey` followed by the ceremony replay from the contribution transcripts should land on the same `guess_final.zkey` hash.
>
> **License**: (same as repo)

## Tests / verification

- `sha256sum -c MANIFEST.sha256` passes inside the release archive.
- SHA-256 of `GuessVerifier.sol` matches the source pushed to `zk-guess-contracts/src/generated/GuessVerifier.sol` at the v2 deploy commit.
- A fresh clone of the release can generate a valid proof against the deployed verifier.

## Acceptance

- Release tagged `v2.0.0`, body written, all 7 assets attached.
- MANIFEST.sha256 committed as a release artifact.
- `@custom:circuit-repo` NatSpec pointing to this release lands in the contract.
- Release URL included in the Blockaid `verifiedProject` submission.
