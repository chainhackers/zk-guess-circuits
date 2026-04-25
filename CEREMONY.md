# zk-guess v2 ceremony — contributor steps

Phase-2 multi-party trusted setup. Coordination happens in a Farcaster thread; this doc is just the run-it-once instructions.

[Install snarkjs](https://github.com/iden3/snarkjs#install-snarkjs).

The operator will hand you a previous `.zkey` and a ready-to-run `snarkjs zkey contribute …` line. Run it, return the new `.zkey`, paste the contribution hash that snarkjs prints into the thread.

Filename convention used in the chain: `guess_NNNN_<handle>.zkey` (zero-padded index, contributor handle, e.g. `guess_0003_alice.zkey`). `guess_final.zkey` is reserved for the post-beacon output.

## Example

Command:

```sh
snarkjs zkey contribute guess_0000_init.zkey guess_0001_chainhacker.zkey --name="chainhacker" -e="put high entropy text here"
```

Expected output:

```sh
[INFO]  snarkJS: Circuit Hash:
                88f9ed43 6deed69b 3adfa492 ee69c932
                df2d7650 f87270da dc3960d5 0ab0a8db
                3a57f3ae 9bfb24e3 267b102f 4e5d0133
                d051240e 03a0285c 0129a842 e5418627
[INFO]  snarkJS: Contribution Hash:
                ebdc3ad7 eb97fa91 9d6a1be0 101efb71
                eee8e832 89b89df6 2521796d 7e591a7c
                31cebea3 ed6c4148 c8f91396 55349242
                2bfe7c07 3af4adb9 6d4e204d 747af6f1
```

The Contribution Hash is what you paste back into the Farcaster thread.
