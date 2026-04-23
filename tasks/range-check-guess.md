# Range-check the guess input

Part of the `v2` circuit redesign. Sibling plan: `zk-guess-contracts/docs/superpowers/specs/2026-04-23-clean-redeploy-antimixer-design.md`.

## Goal

Constrain `1 <= guess <= maxNumber` inside the circuit, symmetric with the existing constraints on `number`. Today only `number` and `maxNumber` are range-checked; `guess` is implicitly trusted to be within range because an honest frontend submits in-range guesses and the contract doesn't game-logically care whether an out-of-range guess is correct or not (it never will be since `guess == number` is the only truth condition and `number` is in range).

This is a well-formedness guarantee at the proof layer rather than relying on the UI. It's also additional semantic distance from mixer-shape circuits (which typically do *not* range-check user-supplied values since their values are arbitrary field elements).

## Changes

In `circuits/guess.circom`, alongside the existing range checks on `number`:

```circom
// Check guess >= 1
component guessGeq1 = GreaterEqThan(16);
guessGeq1.in[0] <== guess;
guessGeq1.in[1] <== 1;
guessGeq1.out === 1;

// Check guess <= maxNumber
component guessLeqMax = LessEqThan(16);
guessLeqMax.in[0] <== guess;
guessLeqMax.in[1] <== maxNumber;
guessLeqMax.out === 1;
```

No contract-side change (the contract already relies on proof validity).

## Tests

- **Positive**: `guess = 42`, `maxNumber = 100` → proof generates and verifies.
- **Negative: below range**: `guess = 0`, `maxNumber = 100` → proof generation fails (constraint violation in witness).
- **Negative: above range**: `guess = 101`, `maxNumber = 100` → proof generation fails.
- **Edge**: `guess = 1` and `guess = maxNumber` both succeed.

## Acceptance

- Circom compilation succeeds; constraint count grows by ~64 (two 16-bit `Num2Bits`-based comparators).
- Test suite covers positive, two negatives, and edges.
- Generating a proof with out-of-range `guess` is impossible from the frontend — snarkjs errors with "Unsatisfied constraint".
