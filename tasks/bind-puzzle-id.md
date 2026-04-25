# Bind proof to puzzleId

Track: part of the `v2` circuit redesign for zk-guess. Sibling plan lives at `zk-guess-contracts/docs/superpowers/specs/2026-04-23-clean-redeploy-antimixer-design.md`.

## Goal

Make each Groth16 proof **intrinsically scoped to a specific puzzle** by adding `puzzleId` as a public input. A valid proof for puzzle A cannot be replayed on puzzle B even if A and B share the same commitment (which is rare but possible if two creators pick the same secret + salt). Closes a silent replay surface and — equally important for the anti-mixer narrative — makes it visually obvious at the circuit level that every proof is deposit-scoped. Mixers go to great lengths to *not* bind proofs to specific deposits.

## Changes

In `circuits/guess.circom`:

- Add `signal input puzzleId;` at the top of `GuessNumber()`.
- Add `puzzleId` to the `component main { public [...] }` list at the bottom: `public [guess, maxNumber, puzzleId]`.
- Multiply-and-discard the signal to force it into the constraint system so that the prover cannot change `puzzleId` without invalidating the proof. Idiomatic Circom pattern:
  ```circom
  signal puzzleIdSquared;
  puzzleIdSquared <== puzzleId * puzzleId;
  ```
  The `puzzleIdSquared` value is unused; the constraint is what matters.

Public signals, post-change: `[commitment, isCorrect, guess, maxNumber, puzzleId]` (5 total).

Contract-side consumer change (tracked separately in `zk-guess-contracts`):
- `GuessGame.respondToChallenge` reads `_pubSignals[4]` and reverts with `InvalidPuzzleIdBinding()` if it doesn't match the stored `challengeToPuzzle[challengeId]`.

Frontend-side consumer change (tracked in `zk-guess` frontend):
- `generate-proof.js` / client-side proof gen passes `puzzleId: <uint256>` as an additional input.

## Tests

In `test/guess.test.ts`:

- **Positive**: proof generated with `puzzleId = 7` verifies successfully; the verifier output includes `puzzleId = 7` as public signal 4.
- **Negative (rebind attempt)**: take a valid proof for `puzzleId = 7`, try to submit it claiming `puzzleId = 8` — verification fails.
- **Constraint soundness**: attempt to generate a proof with a witness where `puzzleId` in the witness differs from `puzzleId` in the public inputs. Circom's witness calculator should either refuse or the proof should not verify.

## Acceptance

- `circom guess.circom --r1cs --wasm --sym` produces R1CS with one extra public input and one extra constraint (the `puzzleIdSquared` multiplication).
- `snarkjs groth16 verify` returns `true` for a proof where `puzzleId` matches witness, `false` where it differs.
- Test suite green.
- Number of constraints grows by ≤ 5 (dominated by the range-check task, not this one).
