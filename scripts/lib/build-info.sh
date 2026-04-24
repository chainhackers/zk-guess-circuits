#!/bin/bash
# write_build_info <circuits_repo_dir> <dest_dir> <warning>
# Emits a BUILD_INFO.txt in <dest_dir> stamping the source commit, describe,
# timestamp, and a caller-supplied warning line. Sourced by copy scripts.
write_build_info() {
    local circuits_dir="$1"
    local dest_dir="$2"
    local warning="$3"

    local src_sha src_describe timestamp
    src_sha="$(git -C "$circuits_dir" rev-parse HEAD)"
    src_describe="$(git -C "$circuits_dir" describe --always --dirty)"
    timestamp="$(LC_ALL=C date -u +%Y-%m-%dT%H:%M:%SZ)"

    cat > "$dest_dir/BUILD_INFO.txt" <<EOF
BUILD=dev
WARNING: $warning
SOURCE_REPO=chainhackers/zk-guess-circuits
SOURCE_SHA=$src_sha
SOURCE_DESCRIBE=$src_describe
COPIED_AT=$timestamp
EOF

    echo "$src_describe"
}
