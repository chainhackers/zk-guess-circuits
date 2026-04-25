#!/bin/bash
set -euo pipefail

# Copy dev circuit artifacts to contracts repo (sibling directory).
# These are DEV artifacts from scripts/setup-dev.ts — not ceremony output.
# Shipping artifacts (guess_final.zkey from the phase-2 ceremony) are copied
# separately once the ceremony lands.
#
# Directory layout:
#   parent/
#     zk-guess-circuits/  (this repo)
#     zk-guess-contracts/ (contracts repo)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$CIRCUITS_DIR/../zk-guess-contracts"

# shellcheck source=lib/build-info.sh
source "$SCRIPT_DIR/lib/build-info.sh"

mkdir -p "$CONTRACTS_DIR/circuits"
mkdir -p "$CONTRACTS_DIR/src/generated"

# Regenerate the Solidity verifier from the current dev zkey so we never ship
# a GuessVerifier.sol that drifted from the zkey sitting next to it.
(cd "$CIRCUITS_DIR" && bun run export-verifier)

cp "$CIRCUITS_DIR/circuits/guess.circom" "$CONTRACTS_DIR/circuits/guess.circom"
cp "$CIRCUITS_DIR/generated/GuessVerifier.sol" "$CONTRACTS_DIR/src/generated/GuessVerifier.sol"
cp "$CIRCUITS_DIR/generated/guess_js/guess.wasm" "$CONTRACTS_DIR/circuits/guess.wasm"
cp "$CIRCUITS_DIR/generated/guess_dev.zkey" "$CONTRACTS_DIR/circuits/guess_dev.zkey"

describe=$(write_build_info "$CIRCUITS_DIR" "$CONTRACTS_DIR/circuits" \
    "Single-contributor dev setup, NOT a trusted-setup ceremony. Do not deploy the derived GuessVerifier.sol to mainnet. Shipping artifacts will be copied separately after the phase-2 ceremony produces guess_final.zkey.")

echo "✓ Copied dev artifacts to contracts repo (BUILD=dev, $describe)"
