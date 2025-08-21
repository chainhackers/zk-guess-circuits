#!/bin/bash

# Script to copy circuit artifacts to contracts repository
# NOTE: This script assumes the contracts repo is in a sibling directory
# Directory structure should be:
#   parent/
#     zk-guess-circuits/  (this repo)
#     zk-guess-contracts/ (contracts repo)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$CIRCUITS_DIR/../zk-guess-contracts"

# Ensure directories exist
mkdir -p "$CONTRACTS_DIR/circuits"
mkdir -p "$CONTRACTS_DIR/src"

# Copy circuit file
cp "$CIRCUITS_DIR/circuits/guess.circom" "$CONTRACTS_DIR/circuits/guess.circom"

# Copy verifier contract
cp "$CIRCUITS_DIR/generated/GuessVerifier.sol" "$CONTRACTS_DIR/src/GuessVerifier.sol"

echo "✓ Copied artifacts to contracts repo"
