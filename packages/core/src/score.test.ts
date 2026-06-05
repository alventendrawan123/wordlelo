import { describe, expect, it } from "vitest";
import { scoreGuess } from "./score.js";

const G = "green";
const Y = "yellow";
const X = "gray";

describe("scoreGuess — known cases", () => {
  it("all green on exact match", () => {
    expect(scoreGuess("CRANE", "CRANE")).toEqual([G, G, G, G, G]);
  });

  it("all gray when nothing is shared", () => {
    expect(scoreGuess("FGHJK", "QWXYZ")).toEqual([X, X, X, X, X]);
  });

  it("yellows for present-but-misplaced letters (ARISE vs RAISE)", () => {
    expect(scoreGuess("ARISE", "RAISE")).toEqual([Y, Y, G, G, G]);
  });

  it("duplicate guess letter, single in answer (SPEED vs ABIDE)", () => {
    // only one E exists in the answer → the first E is yellow, the second gray.
    expect(scoreGuess("SPEED", "ABIDE")).toEqual([X, X, Y, X, Y]);
  });

  it("green takes priority over yellow for duplicates (ALLEY vs LOLLY)", () => {
    expect(scoreGuess("ALLEY", "LOLLY")).toEqual([X, Y, G, X, G]);
  });

  it("extra duplicate goes gray once the answer supply is exhausted (LLAMA vs ALLOY)", () => {
    expect(scoreGuess("LLAMA", "ALLOY")).toEqual([Y, G, Y, X, X]);
  });

  it("is case-insensitive", () => {
    expect(scoreGuess("crane", "CRANE")).toEqual([G, G, G, G, G]);
  });

  it("throws on length mismatch", () => {
    expect(() => scoreGuess("ABC", "ABCD")).toThrow(/length mismatch/);
  });
});

// Independent characterization of correct Wordle scoring, checked EXHAUSTIVELY over
// every (guess, answer) pair in {A,B,C}^5 (243 x 243 = 59,049 pairs — heavy on
// duplicates). These two invariants fully define correct scoring, independent of
// the two-pass implementation:
//   1. a position is green iff guess[i] === answer[i]
//   2. for each letter, #(non-gray) === min(#in guess, #in answer)
describe("scoreGuess — invariants (exhaustive over {A,B,C}^5)", () => {
  function allWords(alphabet: string, len: number): string[] {
    if (len === 0) return [""];
    const rest = allWords(alphabet, len - 1);
    return [...alphabet].flatMap((c) => rest.map((w) => c + w));
  }
  function count(word: string, letter: string): number {
    let k = 0;
    for (const ch of word) {
      if (ch === letter) k++;
    }
    return k;
  }

  it("holds for all 59,049 pairs", () => {
    const words = allWords("ABC", 5);
    const failures: string[] = [];

    for (const answer of words) {
      for (const guess of words) {
        const marks = scoreGuess(guess, answer);

        for (let i = 0; i < 5; i++) {
          if ((marks[i] === "green") !== (guess[i] === answer[i])) {
            failures.push(`green ${guess}/${answer}@${i}`);
          }
        }

        for (const letter of new Set(guess)) {
          let nonGray = 0;
          for (let i = 0; i < 5; i++) {
            if (guess[i] === letter && marks[i] !== "gray") nonGray++;
          }
          if (nonGray !== Math.min(count(guess, letter), count(answer, letter))) {
            failures.push(`count ${guess}/${answer}/${letter}`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
