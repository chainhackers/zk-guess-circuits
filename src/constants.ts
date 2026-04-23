// Shared v2 circuit constants. The circuit (circuits/guess.circom) hard-codes
// the same DOMAIN_TAG literal. Downstream consumers (zk-guess frontend) should
// import from this file so the circuit and client never drift.

// keccak256("zkguess.v2") mod p(BN254). Hashes the 10 ASCII bytes of the string
// "zkguess.v2" (no trailing newline), reduced modulo the BN254 scalar field.
// Reproduce with:
//   node -e 'const {keccak256}=require("js-sha3");
//     const P=21888242871839275222246405745257275088548364400416034343698204186575808495617n;
//     console.log((BigInt("0x"+keccak256("zkguess.v2")) % P).toString());'
export const DOMAIN_TAG_PREIMAGE = "zkguess.v2";
export const DOMAIN_TAG = 6000605569458108169701754207643449997818461959397281845176039583157698733685n;
