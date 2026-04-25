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

// Cache the Poseidon instance — WASM init is ~200ms and this gets called many times
// across the test suite.
let poseidonPromise: ReturnType<typeof buildPoseidon> | null = null;
const getPoseidon = () => (poseidonPromise ??= buildPoseidon());

export async function poseidonHash(inputs: (number | bigint)[]): Promise<string> {
  // Reject `number` inputs past 2^53-1 — circomlibjs would silently truncate
  // the floating-point value before hashing, producing a wrong commitment.
  const normalized = inputs.map((v) => {
    if (typeof v === "bigint") return v;
    if (!Number.isSafeInteger(v)) {
      throw new TypeError(`poseidonHash: number inputs must be safe integers; got ${v}`);
    }
    return BigInt(v);
  });
  const poseidon = await getPoseidon();
  return poseidon.F.toString(poseidon(normalized));
}

export async function calculateCommitment(number: number | bigint, salt: number | bigint): Promise<string> {
  return poseidonHash([DOMAIN_TAG, number, salt]);
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