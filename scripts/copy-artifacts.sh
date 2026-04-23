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

mkdir -p "$CONTRACTS_DIR/circuits"
mkdir -p "$CONTRACTS_DIR/src/generated"

cp "$CIRCUITS_DIR/circuits/guess.circom" "$CONTRACTS_DIR/circuits/guess.circom"
cp "$CIRCUITS_DIR/generated/GuessVerifier.sol" "$CONTRACTS_DIR/src/generated/GuessVerifier.sol"
cp "$CIRCUITS_DIR/generated/guess_js/guess.wasm" "$CONTRACTS_DIR/circuits/guess.wasm"
cp "$CIRCUITS_DIR/generated/guess_dev.zkey" "$CONTRACTS_DIR/circuits/guess_dev.zkey"

SRC_SHA="$(git -C "$CIRCUITS_DIR" rev-parse HEAD)"
SRC_DESCRIBE="$(git -C "$CIRCUITS_DIR" describe --always --dirty)"
TIMESTAMP="$(LC_ALL=C date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$CONTRACTS_DIR/circuits/BUILD_INFO.txt" <<EOF
BUILD=dev
WARNING: These artifacts are from a single-contributor dev setup, NOT a trusted-setup ceremony.
Do not deploy the derived GuessVerifier.sol to mainnet. Shipping artifacts will be copied
separately after the phase-2 ceremony produces guess_final.zkey.
SOURCE_REPO=chainhackers/zk-guess-circuits
SOURCE_SHA=$SRC_SHA
SOURCE_DESCRIBE=$SRC_DESCRIBE
COPIED_AT=$TIMESTAMP
EOF

echo "✓ Copied dev artifacts to contracts repo (BUILD=dev, $SRC_DESCRIBE)"
