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

  it("should include guess in public signals", async () => {
    const inputs: CircuitInputs = {
      number: "11",
      salt: "12345",
      guess: "20"
    };

    const { publicSignals } = await generateProof(
      inputs,
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    expect(publicSignals[2]).toBe(inputs.guess);
  });
});

/**
 * Vulnerability Tests: Public Input Manipulation (FIXED)
 *
 * These tests verify the fix for the proof substitution vulnerability.
 * Previously, `guess` was private, allowing creators to generate proofs
 * with arbitrary guess values. Now `guess` is a public signal.
 *
 * Related: https://github.com/chainhackers/zk-guess-contracts/issues/5
 * Fix: https://github.com/chainhackers/zk-guess-contracts/pull/8
 */
describe("Vulnerability Fix: Guess Now Public", () => {
  let circuitPaths: ReturnType<typeof getCircuitPaths>;

  beforeAll(() => {
    circuitPaths = getCircuitPaths("guess");
  });

  it("FIX: guess value is exposed in public signals", async () => {
    const { publicSignals } = await generateProof(
      { number: "42", salt: "12345", guess: "99" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Circuit now outputs 3 public signals:
    // [0] = commitment, [1] = isCorrect, [2] = guess
    expect(publicSignals.length).toBe(3);
    expect(publicSignals[2]).toBe("99");
  });

  it("FIX: proofs with different guesses have different public signals", async () => {
    const secretNumber = "42";
    const salt = "12345";

    const proof42 = await generateProof(
      { number: secretNumber, salt, guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    const proof99 = await generateProof(
      { number: secretNumber, salt, guess: "99" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Same commitment
    expect(proof42.publicSignals[0]).toBe(proof99.publicSignals[0]);

    // Different isCorrect
    expect(proof42.publicSignals[1]).toBe("1");
    expect(proof99.publicSignals[1]).toBe("0");

    // Different guess (NOW VISIBLE!)
    expect(proof42.publicSignals[2]).toBe("42");
    expect(proof99.publicSignals[2]).toBe("99");
  });

  it("FIX: attack prevented - proof substitution now detectable", async () => {
    // Scenario: Player correctly guesses 42, creator tries to cheat
    const secretNumber = 42;
    const salt = 12345;
    const playerGuess = 42;

    const commitment = await calculateCommitment(secretNumber, salt);

    // Creator tries to generate proof with wrong guess
    const { proof, publicSignals } = await generateProof(
      { number: String(secretNumber), salt: String(salt), guess: "99" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Proof is valid and commitment matches
    const isValidProof = await verifyProof(proof, publicSignals, circuitPaths.vKeyPath);
    expect(isValidProof).toBe(true);
    expect(publicSignals[0]).toBe(commitment);
    expect(publicSignals[1]).toBe("0"); // isCorrect = false

    // BUT: Contract can now detect the mismatch!
    const proofGuess = Number(publicSignals[2]);
    expect(proofGuess).toBe(99);
    expect(proofGuess).not.toBe(playerGuess);

    // Contract rejects: proofGuess (99) != challenge.guess (42)
  });
});
