#!/bin/bash

# Copy circuit artifacts to frontend
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$CIRCUITS_DIR/../zk-guess/frontend"

# Create directories
mkdir -p "$FRONTEND_DIR/public/circuits"

# Copy files
cp "$CIRCUITS_DIR/generated/guess_js/guess.wasm" "$FRONTEND_DIR/public/circuits/"
cp "$CIRCUITS_DIR/generated/guess_final.zkey" "$FRONTEND_DIR/public/circuits/"
cp "$CIRCUITS_DIR/generated/guess_verification_key.json" "$FRONTEND_DIR/public/circuits/"

echo "✓ Copied circuit artifacts to frontend"