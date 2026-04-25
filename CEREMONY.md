# zk-guess v2 ceremony — contributor steps

Phase-2 multi-party trusted setup. Coordination happens in a Farcaster thread; this doc is just the run-it-once instructions.

[Install snarkjs](https://github.com/iden3/snarkjs#install-snarkjs).

The operator will hand you a previous `.zkey` and a ready-to-run `snarkjs zkey contribute …` line. Run it, return the new `.zkey`, paste the contribution hash that snarkjs prints into the thread.

Filename convention used in the chain: `guess_NNNN_<handle>.zkey` (zero-padded index, contributor handle, e.g. `guess_0003_alice.zkey`). `guess_final.zkey` is reserved for the post-beacon output.
