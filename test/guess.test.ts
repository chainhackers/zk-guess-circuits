import { describe, it, expect, beforeAll } from "vitest";
import { generateProof, verifyProof, calculateCommitment, getCircuitPaths } from "./utils";
import type { CircuitInputs } from "./utils";

describe("GuessNumber Circuit", () => {
  let circuitPaths: ReturnType<typeof getCircuitPaths>;

  beforeAll(() => {
    circuitPaths = getCircuitPaths("guess");
  });

  it("should generate correct commitment", async () => {
    const inputs: CircuitInputs = {
      number: "42",
      salt: "12345",
      guess: "50"
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
      guess: "42"
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
      guess: "42"
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
      guess: "42"
    };

    const inputs2: CircuitInputs = {
      number: "42",
      salt: "54321",
      guess: "42"
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

  it("should enforce range constraints (1-100)", async () => {
    // Test number = 0 (should fail)
    await expect(generateProof(
      {
        number: "0",
        salt: "12345",
        guess: "0"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    // Test number = 101 (should fail)
    await expect(generateProof(
      {
        number: "101",
        salt: "12345",
        guess: "101"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    )).rejects.toThrow();

    // Test number = 1 (should pass)
    const { publicSignals: signals1 } = await generateProof(
      {
        number: "1",
        salt: "12345",
        guess: "1"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(signals1[1]).toBe("1"); // Correct guess

    // Test number = 100 (should pass)
    const { publicSignals: signals100 } = await generateProof(
      {
        number: "100",
        salt: "12345",
        guess: "100"
      },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );
    expect(signals100[1]).toBe("1"); // Correct guess
  });

  // Proofs must be distinguishable by public signals so the contract knows which proof is for which guess
  it("should produce different public signals for different guesses", async () => {
    const proofA = await generateProof(
      { number: "42", salt: "12345", guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    const proofB = await generateProof(
      { number: "42", salt: "12345", guess: "99" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    expect(proofA.proof).not.toEqual(proofB.proof);
    expect(proofA.publicSignals).not.toEqual(proofB.publicSignals);
  });
});
