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
});

/**
 * Vulnerability Tests: Public Input Manipulation
 *
 * These tests demonstrate the proof substitution vulnerability where
 * the `guess` input is private, allowing creators to generate valid
 * proofs with arbitrary guess values.
 *
 * Related: https://github.com/chainhackers/zk-guess-contracts/issues/5
 * Fix: https://github.com/chainhackers/zk-guess-contracts/pull/8
 */
describe("Vulnerability: Private Guess Input", () => {
  let circuitPaths: ReturnType<typeof getCircuitPaths>;

  beforeAll(() => {
    circuitPaths = getCircuitPaths("guess");
  });

  it("VULN: proofs with different guess values share same commitment", async () => {
    const secretNumber = "42";
    const salt = "12345";

    // Player submits correct guess = 42
    const correctGuessProof = await generateProof(
      { number: secretNumber, salt, guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Creator generates proof with DIFFERENT guess = 99
    const manipulatedProof = await generateProof(
      { number: secretNumber, salt, guess: "99" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Both proofs have SAME commitment (index 0)
    expect(manipulatedProof.publicSignals[0]).toBe(correctGuessProof.publicSignals[0]);

    // But different isCorrect results
    expect(correctGuessProof.publicSignals[1]).toBe("1");  // correct
    expect(manipulatedProof.publicSignals[1]).toBe("0");   // wrong
  });

  it("VULN: valid proof for wrong guess accepted by verifier", async () => {
    const secretNumber = "42";
    const salt = "12345";

    // Creator generates proof claiming player's correct guess (42) is wrong
    // by using a different guess value (99) in the proof
    const { proof, publicSignals } = await generateProof(
      { number: secretNumber, salt, guess: "99" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Proof is cryptographically valid
    const isValid = await verifyProof(proof, publicSignals, circuitPaths.vKeyPath);
    expect(isValid).toBe(true);

    // Commitment matches the game's commitment
    const expectedCommitment = await calculateCommitment(42, 12345);
    expect(publicSignals[0]).toBe(expectedCommitment);

    // But isCorrect=0 even though player guessed correctly
    // Contract would accept this, stealing player's stake
    expect(publicSignals[1]).toBe("0");
  });

  it("VULN: guess value not exposed in public signals", async () => {
    const { publicSignals } = await generateProof(
      { number: "42", salt: "12345", guess: "42" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Current circuit only outputs 2 public signals:
    // [0] = commitment, [1] = isCorrect
    // Guess is NOT included, making verification impossible
    expect(publicSignals.length).toBe(2);
  });

  it("demonstrates attack: steal stake from correct guess", async () => {
    // Scenario: Player correctly guesses 42, but creator cheats
    const secretNumber = 42;
    const salt = 12345;
    const playerGuess = 42; // CORRECT guess

    // Step 1: Creator's commitment (game setup)
    const commitment = await calculateCommitment(secretNumber, salt);

    // Step 2: Player submits challenge with guess=42 (stored on-chain)
    // ... (contract stores challenge.guess = 42)

    // Step 3: Creator generates MALICIOUS proof with guess=99
    const { proof, publicSignals } = await generateProof(
      { number: String(secretNumber), salt: String(salt), guess: "99" },
      circuitPaths.wasmPath,
      circuitPaths.zkeyPath
    );

    // Step 4: Contract verification (all pass!)
    const isValidProof = await verifyProof(proof, publicSignals, circuitPaths.vKeyPath);
    expect(isValidProof).toBe(true);                    // ✓ Valid proof
    expect(publicSignals[0]).toBe(commitment);           // ✓ Commitment matches
    expect(publicSignals[1]).toBe("0");                  // isCorrect = false

    // Attack succeeds: Contract thinks player guessed wrong!
    // Creator steals player's stake despite correct guess

    // FIX: Circuit should expose guess as public signal
    // Contract should verify: proofGuess == challenge.guess
  });
});