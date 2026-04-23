import { describe, it, expect, beforeAll } from "vitest";
import { generateProof, verifyProof, calculateCommitment, calculateCommitmentV1, getCircuitPaths } from "./utils";
import type { CircuitInputs } from "./utils";
import { buildPoseidon } from "circomlibjs";
import { DOMAIN_TAG } from "../src/constants";

describe("GuessNumber Circuit", () => {
  let circuitPaths: ReturnType<typeof getCircuitPaths>;

  beforeAll(() => {
    circuitPaths = getCircuitPaths("guess");
  });

  it("should generate correct commitment", async () => {
    const inputs: CircuitInputs = {
      number: "42",
      salt: "12345",
      guess: "50",
      maxNumber: "100", puzzleId: "7"
    };

    const { publicSignals } = await generateProof(
      inputs,
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // publicSignals[0] is commitment, publicSignals[1] is isCorrect
    const expectedCommitment = await calculateCommitment(42, 12345);
    expect(publicSignals[0]).toBe(expectedCommitment);

    // Check isCorrect is 0 (wrong guess)
    expect(publicSignals[1]).toBe("0");
  });

  it("should return isCorrect=1 for correct guess", async () => {
    const inputs: CircuitInputs = {
      number: "42",
      salt: "12345",
      guess: "42",
      maxNumber: "100", puzzleId: "7"
    };

    const { publicSignals } = await generateProof(
      inputs,
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Check isCorrect is 1 (correct guess)
    expect(publicSignals[1]).toBe("1");

    // Commitment should still be the same
    const expectedCommitment = await calculateCommitment(42, 12345);
    expect(publicSignals[0]).toBe(expectedCommitment);
  });

  it("should generate valid proofs", async () => {
    const inputs: CircuitInputs = {
      number: "42",
      salt: "12345",
      guess: "42",
      maxNumber: "100", puzzleId: "7"
    };

    const { proof, publicSignals } = await generateProof(
      inputs,
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    const isValid = await verifyProof(
      proof,
      publicSignals,
      circuitPaths.vKeyPath
    );

    expect(isValid).toBe(true);
  });

  it("should produce different commitments for different salts", async () => {
    const inputs1: CircuitInputs = {
      number: "42",
      salt: "12345",
      guess: "42",
      maxNumber: "100", puzzleId: "7"
    };

    const inputs2: CircuitInputs = {
      number: "42",
      salt: "54321",
      guess: "42",
      maxNumber: "100", puzzleId: "7"
    };

    const { publicSignals: signals1 } = await generateProof(
      inputs1,
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    const { publicSignals: signals2 } = await generateProof(
      inputs2,
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Same number, different salt = different commitment
    expect(signals1[0]).not.toBe(signals2[0]);

    // Both should be correct guesses
    expect(signals1[1]).toBe("1");
    expect(signals2[1]).toBe("1");
  });

  it("should enforce number >= 1", async () => {
    // Test number = 0 (should fail)
    await expect(generateProof(
      {
        number: "0",
        salt: "12345",
        guess: "0",
        maxNumber: "100", puzzleId: "7"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    // Test number = 1 (should pass)
    const { publicSignals: signals1 } = await generateProof(
      {
        number: "1",
        salt: "12345",
        guess: "1",
        maxNumber: "100", puzzleId: "7"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(signals1[1]).toBe("1"); // Correct guess
  });

  it("should enforce number <= maxNumber", async () => {
    // Test number > maxNumber (should fail)
    await expect(generateProof(
      {
        number: "101",
        salt: "12345",
        guess: "101",
        maxNumber: "100", puzzleId: "7"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    // Test number = maxNumber (should pass)
    const { publicSignals } = await generateProof(
      {
        number: "100",
        salt: "12345",
        guess: "100",
        maxNumber: "100", puzzleId: "7"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(publicSignals[1]).toBe("1"); // Correct guess
  });

  it("should enforce maxNumber <= 65535", async () => {
    // Test maxNumber > 65535 (should fail)
    await expect(generateProof(
      {
        number: "100",
        salt: "12345",
        guess: "100",
        maxNumber: "65536", puzzleId: "7"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    // Test maxNumber = 65535 (should pass)
    const { publicSignals } = await generateProof(
      {
        number: "65535",
        salt: "12345",
        guess: "65535",
        maxNumber: "65535", puzzleId: "7"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(publicSignals[1]).toBe("1"); // Correct guess
  });

  it("should enforce maxNumber >= 1", async () => {
    // Test maxNumber = 0 (should fail)
    await expect(generateProof(
      {
        number: "1",
        salt: "12345",
        guess: "1",
        maxNumber: "0", puzzleId: "7"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();
  });

  // Proofs must be distinguishable by public signals so the contract knows which proof is for which guess
  it("should produce different public signals for different guesses", async () => {
    const proofA = await generateProof(
      { number: "42", salt: "12345", guess: "42", maxNumber: "100", puzzleId: "7" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    const proofB = await generateProof(
      { number: "42", salt: "12345", guess: "99", maxNumber: "100", puzzleId: "7" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    expect(proofA.proof).not.toEqual(proofB.proof);
    expect(proofA.publicSignals).not.toEqual(proofB.publicSignals);
  });

  it("should expose maxNumber and puzzleId in public signals", async () => {
    const { publicSignals } = await generateProof(
      { number: "42", salt: "12345", guess: "42", maxNumber: "100", puzzleId: "7" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Public signals: [commitment, isCorrect, guess, maxNumber, puzzleId]
    expect(publicSignals[2]).toBe("42"); // guess
    expect(publicSignals[3]).toBe("100"); // maxNumber
    expect(publicSignals[4]).toBe("7"); // puzzleId
  });

  it("should domain-separate commitments from v1 (Poseidon(2))", async () => {
    const { publicSignals } = await generateProof(
      { number: "42", salt: "12345", guess: "42", maxNumber: "100", puzzleId: "7" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    const v2 = await calculateCommitment(42, 12345);
    const v1 = await calculateCommitmentV1(42, 12345);

    // Circuit produces the v2 commitment
    expect(publicSignals[0]).toBe(v2);
    // v1 commitment for the same (number, salt) is different from v2
    expect(v1).not.toBe(v2);
  });

  it("should produce different commitments under different DOMAIN_TAGs", async () => {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    const withV2Tag = F.toString(poseidon([DOMAIN_TAG, 42n, 12345n]));
    const withV3Tag = F.toString(poseidon([DOMAIN_TAG + 1n, 42n, 12345n]));

    expect(withV2Tag).not.toBe(withV3Tag);
  });

  it("should reject a proof rebound to a different puzzleId", async () => {
    const { proof, publicSignals } = await generateProof(
      { number: "42", salt: "12345", guess: "42", maxNumber: "100", puzzleId: "7" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Baseline: the original public signals verify
    expect(await verifyProof(proof, publicSignals, circuitPaths.vKeyPath)).toBe(true);

    // Tamper: swap puzzleId 7 -> 8 in the public-signals array and re-verify
    const tampered = [...publicSignals];
    tampered[4] = "8";
    expect(await verifyProof(proof, tampered, circuitPaths.vKeyPath)).toBe(false);
  });

  it("should enforce guess >= 1", async () => {
    // guess = 0 is below range
    await expect(generateProof(
      { number: "42", salt: "12345", guess: "0", maxNumber: "100", puzzleId: "7" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    // guess = 1 (edge) succeeds
    const { publicSignals } = await generateProof(
      { number: "42", salt: "12345", guess: "1", maxNumber: "100", puzzleId: "7" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(publicSignals[1]).toBe("0"); // wrong guess, but in-range
    expect(publicSignals[2]).toBe("1");
  });

  it("should enforce guess <= maxNumber", async () => {
    // guess = 101 exceeds maxNumber = 100
    await expect(generateProof(
      { number: "42", salt: "12345", guess: "101", maxNumber: "100", puzzleId: "7" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    // guess = maxNumber (edge) succeeds
    const { publicSignals } = await generateProof(
      { number: "42", salt: "12345", guess: "100", maxNumber: "100", puzzleId: "7" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(publicSignals[1]).toBe("0"); // 100 != 42
    expect(publicSignals[2]).toBe("100");
  });
});
