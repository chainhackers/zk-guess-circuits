import { generateProof, calculateCommitment, getCircuitPaths } from "../test/utils";
import type { CircuitInputs } from "../test/utils";
import fs from "fs";
import path from "path";

async function generateTestProofs() {
  const circuitPaths = getCircuitPaths("guess");
  
  // Test case 1: number=42, salt=123, correct guess
  const inputs1: CircuitInputs = {
    number: "42",
    salt: "123",
    guess: "42"
  };
  
  console.log("Generating proof for correct guess (42)...");
  const { proof: proof1, publicSignals: signals1 } = await generateProof(
    inputs1,
    circuitPaths.wasmPath,
    circuitPaths.zkeyPath
  );
  
  const commitment = await calculateCommitment(42, 123);
  console.log("Commitment for (42, 123):", commitment);
  console.log("Expected commitment hex:", "0x" + BigInt(commitment).toString(16));
  
  // Test case 2: number=42, salt=123, incorrect guess (50)
  const inputs2: CircuitInputs = {
    number: "42",
    salt: "123",
    guess: "50"
  };
  
  console.log("\nGenerating proof for incorrect guess (50)...");
  const { proof: proof2, publicSignals: signals2 } = await generateProof(
    inputs2,
    circuitPaths.wasmPath,
    circuitPaths.zkeyPath
  );
  
  // Format proofs for Solidity
  const formatProofForSolidity = (proof: any, publicSignals: string[]) => {
    return {
      pA: [proof.pi_a[0], proof.pi_a[1]],
      pB: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
      pC: [proof.pi_c[0], proof.pi_c[1]],
      pubSignals: publicSignals
    };
  };
  
  const solidityProof1 = formatProofForSolidity(proof1, signals1);
  const solidityProof2 = formatProofForSolidity(proof2, signals2);
  
  console.log("\n=== PROOF FOR CORRECT GUESS (42) ===");
  console.log("uint[2] validProofA_correct = [");
  console.log(`    ${solidityProof1.pA[0]},`);
  console.log(`    ${solidityProof1.pA[1]}`);
  console.log("];");
  
  console.log("uint[2][2] validProofB_correct = [");
  console.log(`    [${solidityProof1.pB[0][0]},`);
  console.log(`     ${solidityProof1.pB[0][1]}],`);
  console.log(`    [${solidityProof1.pB[1][0]},`);
  console.log(`     ${solidityProof1.pB[1][1]}]`);
  console.log("];");
  
  console.log("uint[2] validProofC_correct = [");
  console.log(`    ${solidityProof1.pC[0]},`);
  console.log(`    ${solidityProof1.pC[1]}`);
  console.log("];");
  
  console.log("uint[2] validPubSignals_correct = [");
  console.log(`    uint256(${solidityProof1.pubSignals[0]}),`);
  console.log(`    ${solidityProof1.pubSignals[1]} // isCorrect`);
  console.log("];");
  
  console.log("\n=== PROOF FOR INCORRECT GUESS (50) ===");
  console.log("uint[2] validProofA_incorrect = [");
  console.log(`    ${solidityProof2.pA[0]},`);
  console.log(`    ${solidityProof2.pA[1]}`);
  console.log("];");
  
  console.log("uint[2][2] validProofB_incorrect = [");
  console.log(`    [${solidityProof2.pB[0][0]},`);
  console.log(`     ${solidityProof2.pB[0][1]}],`);
  console.log(`    [${solidityProof2.pB[1][0]},`);
  console.log(`     ${solidityProof2.pB[1][1]}]`);
  console.log("];");
  
  console.log("uint[2] validProofC_incorrect = [");
  console.log(`    ${solidityProof2.pC[0]},`);
  console.log(`    ${solidityProof2.pC[1]}`);
  console.log("];");
  
  console.log("uint[2] validPubSignals_incorrect = [");
  console.log(`    uint256(${solidityProof2.pubSignals[0]}),`);
  console.log(`    ${solidityProof2.pubSignals[1]} // isCorrect`);
  console.log("];");
}

generateTestProofs().catch(console.error);