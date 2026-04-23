# Bind proof to guesser address (optional)

Part of the `v2` circuit redesign. Sibling plan: `zk-guess-contracts/docs/superpowers/specs/2026-04-23-clean-redeploy-antimixer-design.md`.

**Status: optional.** Ship if it doesn't push the trusted-setup ceremony timeline; skip otherwise. Marginal value for the target threat model.

## Goal

Add `guesser` (an Ethereum address, fits in a single 160-bit field element) as a public input to the circuit, bound into the proof. Prevents a third party from front-running someone else's proof submission by replaying it with the same witness but under their own `msg.sender`. Not a fund-at-risk scenario (prize goes to `challenge.guesser` regardless), but cleaner proof hygiene and another semantic differentiator from mixers (which carefully *avoid* binding proofs to specific addresses — the whole point of a mixer is unlinkability).

## Changes

In `circuits/guess.circom`:

```circom
signal input guesser;  // uint160 as a field element

// force into constraint system, same technique as puzzleId binding
signal guesserSquared;
guesserSquared <== guesser * guesser;
```

Add `guesser` to the public input list: `public [guess, maxNumber, puzzleId, guesser]`. Final public signals: `[commitment, isCorrect, guess, maxNumber, puzzleId, guesser]` (6 total).

Contract side (`zk-guess-contracts`):
- `respondToChallenge` reads `_pubSignals[5]` and reverts with `InvalidGuesserBinding()` if it doesn't match the stored `challenges[challengeId].guesser`.

Frontend side (`zk-guess`):
- `generate-proof.js` passes `guesser: <msg.sender address as uint>` as an additional input.

## Decision gate

Only ship if:
1. The trusted-setup ceremony can accommodate an extra public input without re-scheduling contributors.
2. `snarkjs` bn254 tooling handles 160-bit inputs cleanly (should be trivial — addresses fit easily in BN254's 254-bit field).
3. Frontend client has `msg.sender` available at proof-gen time (it does — wallet connection provides it).

If any of these is borderline, skip this task and ship the other three circuit changes. Can be added in v3.

## Tests

- **Positive**: proof generated with `guesser = Alice` verifies with `_pubSignals[5] == uint256(Alice)`.
- **Negative (front-run attempt)**: take Alice's valid proof, try to call `respondToChallenge` as Bob — contract reverts.
- **Witness soundness**: witness with mismatched `guesser` vs public input fails constraint check.

## Acceptance

- Constraint count grows by ≤ 5 (the `guesserSquared` multiplication).
- Test suite covers front-run attempt via contract-side fixture.
- If not shipped, document why in the `v2` spec's "Decisions (locked)" section.
