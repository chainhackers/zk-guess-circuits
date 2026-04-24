import { describe, it, expect, beforeAll } from "vitest";
import { generateProof, verifyProof, calculateCommitment, poseidonHash, getCircuitPaths } from "./utils";
import type { CircuitInputs } from "./utils";
import { ALICE, BOB, DOMAIN_TAG } from "../src/constants";

// Fields every test shares unless a specific case overrides one via spread.
const DEFAULTS = { maxNumber: "100", puzzleId: "7", guesser: ALICE } as const;

describe("GuessNumber Circuit", () => {
  let circuitPaths: ReturnType<typeof getCircuitPaths>;

  beforeAll(() => {
    circuitPaths = getCircuitPaths("guess");
  });

  it("should generate correct commitment", async () => {
    const inputs: CircuitInputs = { ...DEFAULTS, number: "42", salt: "12345", guess: "50" };

    const { publicSignals } = await generateProof(inputs, circuitPaths.wasmPath, circuitPaths.zkeyPath);

    expect(publicSignals[0]).toBe(await calculateCommitment(42, 12345));
    expect(publicSignals[1]).toBe("0");
  });

  it("should return isCorrect=1 for correct guess", async () => {
    const inputs: CircuitInputs = { ...DEFAULTS, number: "42", salt: "12345", guess: "42" };

    const { publicSignals } = await generateProof(inputs, circuitPaths.wasmPath, circuitPaths.zkeyPath);

    expect(publicSignals[1]).toBe("1");
    expect(publicSignals[0]).toBe(await calculateCommitment(42, 12345));
  });

  it("should generate valid proofs", async () => {
    const inputs: CircuitInputs = { ...DEFAULTS, number: "42", salt: "12345", guess: "42" };

    const { proof, publicSignals } = await generateProof(inputs, circuitPaths.wasmPath, circuitPaths.zkeyPath);

    expect(await verifyProof(proof, publicSignals, circuitPaths.vKeyPath)).toBe(true);
  });

  it("should produce different commitments for different salts", async () => {
    const { publicSignals: a } = await generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    const { publicSignals: b } = await generateProof(
      { ...DEFAULTS, number: "42", salt: "54321", guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    expect(a[0]).not.toBe(b[0]);
    expect(a[1]).toBe("1");
    expect(b[1]).toBe("1");
  });

  it("should enforce number >= 1", async () => {
    await expect(generateProof(
      { ...DEFAULTS, number: "0", salt: "12345", guess: "0" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    const { publicSignals } = await generateProof(
      { ...DEFAULTS, number: "1", salt: "12345", guess: "1" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(publicSignals[1]).toBe("1");
  });

  it("should enforce number <= maxNumber", async () => {
    await expect(generateProof(
      { ...DEFAULTS, number: "101", salt: "12345", guess: "101" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    const { publicSignals } = await generateProof(
      { ...DEFAULTS, number: "100", salt: "12345", guess: "100" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(publicSignals[1]).toBe("1");
  });

  it("should enforce maxNumber <= 65535", async () => {
    await expect(generateProof(
      { ...DEFAULTS, number: "100", salt: "12345", guess: "100", maxNumber: "65536" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    const { publicSignals } = await generateProof(
      { ...DEFAULTS, number: "65535", salt: "12345", guess: "65535", maxNumber: "65535" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(publicSignals[1]).toBe("1");
  });

  it("should enforce maxNumber >= 1", async () => {
    await expect(generateProof(
      { ...DEFAULTS, number: "1", salt: "12345", guess: "1", maxNumber: "0" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();
  });

  // Public signals must differ per guess so the contract can tell proofs apart.
  it("should produce different public signals for different guesses", async () => {
    const proofA = await generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    const proofB = await generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "99" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    expect(proofA.proof).not.toEqual(proofB.proof);
    expect(proofA.publicSignals).not.toEqual(proofB.publicSignals);
  });

  it("should expose maxNumber, puzzleId, and guesser in public signals", async () => {
    const { publicSignals } = await generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // [commitment, isCorrect, guess, maxNumber, puzzleId, guesser]
    expect(publicSignals[2]).toBe("42");
    expect(publicSignals[3]).toBe(DEFAULTS.maxNumber);
    expect(publicSignals[4]).toBe(DEFAULTS.puzzleId);
    expect(publicSignals[5]).toBe(DEFAULTS.guesser);
  });

  it("should domain-separate commitments from v1 (Poseidon(2))", async () => {
    const { publicSignals } = await generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    const v2 = await calculateCommitment(42, 12345);
    const v1 = await poseidonHash([42, 12345]);

    expect(publicSignals[0]).toBe(v2);
    expect(v1).not.toBe(v2);
  });

  it("should produce different commitments under different DOMAIN_TAGs", async () => {
    const withV2Tag = await poseidonHash([DOMAIN_TAG, 42n, 12345n]);
    const withV3Tag = await poseidonHash([DOMAIN_TAG + 1n, 42n, 12345n]);

    expect(withV2Tag).not.toBe(withV3Tag);
  });

  it("should reject a proof rebound to a different puzzleId", async () => {
    const { proof, publicSignals } = await generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    expect(await verifyProof(proof, publicSignals, circuitPaths.vKeyPath)).toBe(true);

    const tampered = [...publicSignals];
    tampered[4] = "8";
    expect(await verifyProof(proof, tampered, circuitPaths.vKeyPath)).toBe(false);
  });

  it("should reject a proof rebound to a different guesser (front-run defense)", async () => {
    const { proof, publicSignals } = await generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    expect(await verifyProof(proof, publicSignals, circuitPaths.vKeyPath)).toBe(true);

    const tampered = [...publicSignals];
    tampered[5] = BOB;
    expect(await verifyProof(proof, tampered, circuitPaths.vKeyPath)).toBe(false);
  });

  it("should enforce guess >= 1", async () => {
    await expect(generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "0" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    const { publicSignals } = await generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "1" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(publicSignals[1]).toBe("0");
    expect(publicSignals[2]).toBe("1");
  });

  it("should enforce guess <= maxNumber", async () => {
    await expect(generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "101" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    const { publicSignals } = await generateProof(
      { ...DEFAULTS, number: "42", salt: "12345", guess: "100" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(publicSignals[1]).toBe("0");
    expect(publicSignals[2]).toBe("100");
  });
});
