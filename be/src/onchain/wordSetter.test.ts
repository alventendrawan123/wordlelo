import { encodePacked, keccak256 } from "viem";
import { describe, expect, it } from "vitest";
import { saltForDay, wordForDay } from "../daily/index.js";
import { commitArgsFor, revealArgsFor } from "./wordSetter.js";

const SECRET = "test-secret";
const DAY = 521;

describe("on-chain commit/reveal call data", () => {
  it("commitArgsFor commitment opens with the reveal word + salt (matches the contract)", () => {
    const { commitment } = commitArgsFor(DAY, SECRET);
    const expected = keccak256(
      encodePacked(["string", "bytes32"], [wordForDay(DAY), saltForDay(DAY, SECRET)]),
    );
    expect(commitment).toBe(expected);
  });

  it("revealArgsFor returns the word + salt that reproduce the commitment", () => {
    const { word, salt } = revealArgsFor(DAY, SECRET);
    expect(word).toBe(wordForDay(DAY));
    expect(keccak256(encodePacked(["string", "bytes32"], [word, salt]))).toBe(
      commitArgsFor(DAY, SECRET).commitment,
    );
  });
});
