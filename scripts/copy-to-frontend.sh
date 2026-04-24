#!/bin/bash
set -euo pipefail

# Copy DEV circuit artifacts to the frontend (sibling zk-guess/frontend).
# These are dev-setup artifacts, not ceremony output — BUILD_INFO.txt marks them so.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$CIRCUITS_DIR/../zk-guess/frontend"

# shellcheck source=lib/build-info.sh
source "$SCRIPT_DIR/lib/build-info.sh"

mkdir -p "$FRONTEND_DIR/public/circuits"

cp "$CIRCUITS_DIR/generated/guess_js/guess.wasm" "$FRONTEND_DIR/public/circuits/"
cp "$CIRCUITS_DIR/generated/guess_dev.zkey" "$FRONTEND_DIR/public/circuits/"
cp "$CIRCUITS_DIR/generated/guess_dev_verification_key.json" "$FRONTEND_DIR/public/circuits/"

describe=$(write_build_info "$CIRCUITS_DIR" "$FRONTEND_DIR/public/circuits" \
    "Dev-setup artifacts, not ceremony output. Safe for local testing only.")

echo "✓ Copied dev circuit artifacts to frontend (BUILD=dev, $describe)"
