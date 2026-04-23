#!/bin/bash
set -euo pipefail

# Copy DEV circuit artifacts to the frontend (sibling zk-guess/frontend).
# These are dev-setup artifacts, not ceremony output — BUILD_INFO.txt marks them so.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$CIRCUITS_DIR/../zk-guess/frontend"

mkdir -p "$FRONTEND_DIR/public/circuits"

cp "$CIRCUITS_DIR/generated/guess_js/guess.wasm" "$FRONTEND_DIR/public/circuits/"
cp "$CIRCUITS_DIR/generated/guess_dev.zkey" "$FRONTEND_DIR/public/circuits/"
cp "$CIRCUITS_DIR/generated/guess_dev_verification_key.json" "$FRONTEND_DIR/public/circuits/"

SRC_SHA="$(git -C "$CIRCUITS_DIR" rev-parse HEAD)"
SRC_DESCRIBE="$(git -C "$CIRCUITS_DIR" describe --always --dirty)"
TIMESTAMP="$(LC_ALL=C date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$FRONTEND_DIR/public/circuits/BUILD_INFO.txt" <<EOF
BUILD=dev
WARNING: Dev-setup artifacts, not ceremony output. Safe for local testing only.
SOURCE_REPO=chainhackers/zk-guess-circuits
SOURCE_SHA=$SRC_SHA
SOURCE_DESCRIBE=$SRC_DESCRIBE
COPIED_AT=$TIMESTAMP
EOF

echo "✓ Copied dev circuit artifacts to frontend (BUILD=dev, $SRC_DESCRIBE)"