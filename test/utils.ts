import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import path from "path";
import { fileURLToPath } from "url";
import { DOMAIN_TAG } from "../src/constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CircuitInputs {
  number: string;
  salt: string;
  guess: string;
  maxNumber: string;
  puzzleId: string;
  guesser: string; // uint160 (Ethereum address as decimal bigint string)
}

export interface ProofResult {
  proof: any;
  publicSignals: string[];
}

export async function generateProof(
  inputs: CircuitInputs,
  wasmPath: string,
  zkeyPath: string
): Promise<ProofResult> {
  const { proof, publicSignals } = await groth16.fullProve(
    inputs,
    wasmPath,
    zkeyPath
  );
  
  return { proof, publicSignals };
}

export async function verifyProof(
  proof: any,
  publicSignals: string[],
  vKeyPath: string
): Promise<boolean> {
  const vKey = JSON.parse(await import('fs').then(fs => 
    fs.promises.readFile(vKeyPath, 'utf8')
  ));
  
  return await groth16.verify(vKey, publicSignals, proof);
}

export async function calculateCommitment(number: number | bigint, salt: number | bigint): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const hash = poseidon([DOMAIN_TAG, number, salt]);
  return F.toString(hash);
}

// v1 commitment (Poseidon(2) without domain separation). Retained for regression tests
// that assert v1 commitments cannot be reused under the v2 circuit.
export async function calculateCommitmentV1(number: number | bigint, salt: number | bigint): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const hash = poseidon([number, salt]);
  return F.toString(hash);
}

export function getCircuitPaths(circuitName: string) {
  const base = path.join(__dirname, "..", "generated");
  return {
    wasmPath: path.join(base, `${circuitName}_js`, `${circuitName}.wasm`),
    zkeyPath: path.join(base, `${circuitName}_dev.zkey`),
    vKeyPath: path.join(base, `${circuitName}_dev_verification_key.json`),
    r1csPath: path.join(base, `${circuitName}.r1cs`),
  };
}