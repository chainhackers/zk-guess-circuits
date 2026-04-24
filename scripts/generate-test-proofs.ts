// Print Solidity-formatted proof fixtures for the contracts repo (Foundry FFI).
// Emits one block per scenario with pA, pB, pC, and the v2 public signals:
//   [commitment, isCorrect, guess, maxNumber, puzzleId, guesser]
import { generateProof, calculateCommitment, getCircuitPaths } from "../test/utils";
import type { CircuitInputs } from "../test/utils";
import { ALICE } from "../src/constants";

interface Scenario {
  label: string;
  suffix: string;
  inputs: CircuitInputs;
}

const SCENARIOS: Scenario[] = [
  {
    label: "CORRECT GUESS (42)",
    suffix: "correct",
    inputs: { number: "42", salt: "123", guess: "42", maxNumber: "100", puzzleId: "7", guesser: ALICE },
  },
  {
    label: "INCORRECT GUESS (50)",
    suffix: "incorrect",
    inputs: { number: "42", salt: "123", guess: "50", maxNumber: "100", puzzleId: "7", guesser: ALICE },
  },
  {
    label: "INCORRECT GUESS (99)",
    suffix: "incorrect_99",
    inputs: { number: "42", salt: "123", guess: "99", maxNumber: "100", puzzleId: "7", guesser: ALICE },
  },
];

function formatProofForSolidity(proof: any, publicSignals: string[]) {
  return {
    pA: [proof.pi_a[0], proof.pi_a[1]],
    pB: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
    pC: [proof.pi_c[0], proof.pi_c[1]],
    pubSignals: publicSignals,
  };
}

function printSolidityBlock(label: string, suffix: string, p: ReturnType<typeof formatProofForSolidity>) {
  console.log(`\n=== PROOF FOR ${label} ===`);
  console.log(`uint[2] validProofA_${suffix} = [`);
  console.log(`    ${p.pA[0]},`);
  console.log(`    ${p.pA[1]}`);
  console.log(`];`);

  console.log(`uint[2][2] validProofB_${suffix} = [`);
  console.log(`    [${p.pB[0][0]},`);
  console.log(`     ${p.pB[0][1]}],`);
  console.log(`    [${p.pB[1][0]},`);
  console.log(`     ${p.pB[1][1]}]`);
  console.log(`];`);

  console.log(`uint[2] validProofC_${suffix} = [`);
  console.log(`    ${p.pC[0]},`);
  console.log(`    ${p.pC[1]}`);
  console.log(`];`);

  console.log(`uint[6] validPubSignals_${suffix} = [`);
  console.log(`    uint256(${p.pubSignals[0]}), // commitment`);
  console.log(`    ${p.pubSignals[1]}, // isCorrect`);
  console.log(`    ${p.pubSignals[2]}, // guess`);
  console.log(`    ${p.pubSignals[3]}, // maxNumber`);
  console.log(`    ${p.pubSignals[4]}, // puzzleId`);
  console.log(`    ${p.pubSignals[5]}  // guesser`);
  console.log(`];`);
}

async function generateTestProofs() {
  const circuitPaths = getCircuitPaths("guess");

  const commitment = await calculateCommitment(42, 123);
  console.log(`Commitment for (42, 123) under DOMAIN_TAG: ${commitment}`);
  console.log(`Expected commitment hex: 0x${BigInt(commitment).toString(16)}`);

  for (const scenario of SCENARIOS) {
    console.log(`\nGenerating proof: ${scenario.label}...`);
    const { proof, publicSignals } = await generateProof(
      scenario.inputs,
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    printSolidityBlock(scenario.label, scenario.suffix, formatProofForSolidity(proof, publicSignals));
  }
}

generateTestProofs().catch(console.error);
