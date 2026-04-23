pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template GuessNumber() {
    signal input number;
    signal input salt;
    signal input guess;
    signal input maxNumber; // Creator-defined max (1-65535)
    signal input puzzleId;  // Binds the proof to a specific puzzle

    signal output commitment;
    signal output isCorrect;

    // Force puzzleId into the constraint system so a valid proof for puzzle A
    // cannot be replayed on puzzle B (even if both share the same commitment).
    signal puzzleIdSquared;
    puzzleIdSquared <== puzzleId * puzzleId;

    // Range constraints: ensure number is between 1 and maxNumber
    // Check number >= 1
    component geq1 = GreaterEqThan(16); // 16 bits for numbers up to 65535
    geq1.in[0] <== number;
    geq1.in[1] <== 1;
    geq1.out === 1;

    // Check number <= maxNumber (creator's custom range)
    component leqMax = LessEqThan(16);
    leqMax.in[0] <== number;
    leqMax.in[1] <== maxNumber;
    leqMax.out === 1;

    // Check maxNumber <= 65535 (enforce upper bound)
    component leq65535 = LessEqThan(16);
    leq65535.in[0] <== maxNumber;
    leq65535.in[1] <== 65535;
    leq65535.out === 1;

    // Check maxNumber >= 1 (enforce lower bound)
    component maxGeq1 = GreaterEqThan(16);
    maxGeq1.in[0] <== maxNumber;
    maxGeq1.in[1] <== 1;
    maxGeq1.out === 1;

    // Range-check guess: 1 <= guess <= maxNumber
    // Symmetric with the constraints on `number` so the proof layer, not the UI,
    // guarantees well-formed guesses.
    component guessGeq1 = GreaterEqThan(16);
    guessGeq1.in[0] <== guess;
    guessGeq1.in[1] <== 1;
    guessGeq1.out === 1;

    component guessLeqMax = LessEqThan(16);
    guessLeqMax.in[0] <== guess;
    guessLeqMax.in[1] <== maxNumber;
    guessLeqMax.out === 1;

    // Generate commitment using Poseidon hash
    component hasher = Poseidon(2);
    hasher.inputs[0] <== number;
    hasher.inputs[1] <== salt;
    commitment <== hasher.out;
    
    // Check if guess matches number
    component eq = IsEqual();
    eq.in[0] <== guess;
    eq.in[1] <== number;
    isCorrect <== eq.out;
}

component main {public [guess, maxNumber, puzzleId]} = GuessNumber();
