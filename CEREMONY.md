# zk-guess v2 ceremony — contributor steps

Phase-2 multi-party trusted setup for [zk-guess-circuits](https://github.com/chainhackers/zk-guess-circuits/). Discussion in [this Farcaster thread](https://farcaster.xyz/chainhacker/0x94a225a9).

[Install snarkjs](https://github.com/iden3/snarkjs#install-snarkjs).

The operator will hand you a previous `.zkey` and a ready-to-run `snarkjs zkey contribute …` line. Run it, send the new `.zkey` back, paste the Contribution Hash into the thread.

Filename: `guess_NNNN_<tag>.zkey` — zero-padded index + 2–4 char handle (e.g. `guess_0001_ch.zkey`). `guess_final.zkey` is reserved for the post-beacon output.

## Returning the file

Farcaster casts carry images, not arbitrary files. Upload your `.zkey` anywhere public — e.g. [temp.sh](https://temp.sh) (`curl -F'file=@guess_NNNN_<tag>.zkey' https://temp.sh/upload`, no account, 3-day retention) or a release asset on your own [zk-guess-circuits](https://github.com/chainhackers/zk-guess-circuits/) fork — and paste the URL in your reply with the Contribution Hash.

## Example

```sh
snarkjs zkey contribute guess_0000_init.zkey guess_0001_ch.zkey --name="ch" -e="put high entropy text here"
```

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
