import { describe, expect, it } from "vitest";
import { evaluateGuess, isWin } from "./evaluate";

describe("evaluateGuess", () => {
  it("marks an exact match all correct", () => {
    expect(evaluateGuess("CRANE", "CRANE")).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("marks all absent when nothing overlaps", () => {
    expect(evaluateGuess("MUDDY", "CRANE")).toEqual([
      "absent",
      "absent",
      "absent",
      "absent",
      "absent",
    ]);
  });

  it("greens take priority and consume the letter (ALLEY vs LOLLY)", () => {
    expect(evaluateGuess("ALLEY", "LOLLY")).toEqual([
      "absent",
      "present",
      "correct",
      "absent",
      "correct",
    ]);
  });

  it("marks extra copies absent once the answer's supply is used (EERIE vs REACT)", () => {
    expect(evaluateGuess("EERIE", "REACT")).toEqual([
      "absent",
      "correct",
      "present",
      "absent",
      "absent",
    ]);
  });

  it("is case-insensitive", () => {
    expect(evaluateGuess("crane", "crane")).toEqual(
      evaluateGuess("CRANE", "CRANE"),
    );
  });
});

describe("isWin", () => {
  it("is true only when every mark is correct", () => {
    expect(isWin(["correct", "correct", "correct", "correct", "correct"])).toBe(
      true,
    );
    expect(isWin(["correct", "correct", "present", "correct", "correct"])).toBe(
      false,
    );
  });

  it("is false for an empty result", () => {
    expect(isWin([])).toBe(false);
  });
});
