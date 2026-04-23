# Domain-separate the commitment hash

Part of the `v2` circuit redesign. Sibling plan: `zk-guess-contracts/docs/superpowers/specs/2026-04-23-clean-redeploy-antimixer-design.md`.

## Goal

Replace `Poseidon([number, salt])` with `Poseidon([DOMAIN_TAG, number, salt])` where `DOMAIN_TAG` is a hard-coded circuit constant derived from `keccak256("zkguess.v2") mod p` (BN254 scalar field).

Domain separation guarantees v1 commitments can never be confused with v2 commitments under any future composition (for example, if both systems ever co-exist in a shared rollup or registry, or if a cross-protocol proof aggregation ever emerges). Standard practice on protocol upgrades; contributes to the "this is clearly a different system from v1" narrative for scanners and auditors.

## Changes

In `circuits/guess.circom`:

- Replace `component hasher = Poseidon(2);` with `Poseidon(3)`.
- Hard-code the domain tag as a field-element constant at the top of the template:
  ```circom
  // keccak256("zkguess.v2") mod p(BN254)
  // pre-computed offline and committed here verbatim
  var DOMAIN_TAG = <field element hex or decimal literal>;
  ```
  The exact value must be computed by the ceremony operator and committed as part of this task.
- Pass it as the first input: `hasher.inputs[0] <== DOMAIN_TAG;`, then `hasher.inputs[1] <== number;`, `hasher.inputs[2] <== salt;`.

Frontend consumer change (tracked in `zk-guess` frontend):
- `computeCommitment(number, salt)` must be updated to also include the same `DOMAIN_TAG`. The tag value should be exported from a shared module (e.g., `constants/v2.ts`) so circuit + client use the same literal.

Indexer consumer change (`zk-guess-indexer`):
- None required — indexer doesn't reconstruct commitments.

Contract consumer change:
- None required — contract treats commitment as opaque `bytes32`.

## DOMAIN_TAG computation (done once, committed to the circuit)

```bash
# pseudocode
K=$(echo -n "zkguess.v2" | xxd -p | xxd -r -p | keccak256sum)
P=21888242871839275222246405745257275088548364400416034343698204186575808495617  # BN254 scalar field modulus
python -c "print(int('${K}', 16) % ${P})"
```

Commit this constant in the circuit AND in a shared config module consumed by the frontend.

## Tests

- **Positive**: commitment produced by the new circuit for `(number=42, salt=X)` matches the client-side `Poseidon3([DOMAIN_TAG, 42, X])`.
- **Negative: v1 regression**: a commitment produced with the old `Poseidon2([number, salt])` no longer verifies under the new circuit.
- **Cross-domain safety**: two commitments with identical `(number, salt)` but different DOMAIN_TAG (e.g., `"zkguess.v2"` vs `"zkguess.v3"`) are distinct.

## Acceptance

- Circuit compiles; one extra Poseidon input increases the constraint count by a small amount.
- Shared constant exported and linked from NatSpec of `GuessGame` via `@custom:commitment-domain`.
- Frontend commitment-gen updated and unit-tested against the circuit output.
