import { describe, expect, it } from "vitest";
import type { LetterState } from "@/types/game";
import { buildShareText } from "./share";

const rows: LetterState[][] = [
  ["correct", "present", "absent", "absent", "absent"],
  ["correct", "correct", "correct", "correct", "correct"],
];

describe("buildShareText", () => {
  it("formats the header with day and score", () => {
    const text = buildShareText({
      day: 521,
      guesses: 2,
      maxGuesses: 6,
      won: true,
      hardMode: false,
      colorblind: false,
      rows,
    });
    expect(text.split("\n")[0]).toBe("Wordlelo 521 2/6");
  });

  it("uses X for a loss and * for hard mode", () => {
    const text = buildShareText({
      day: 521,
      guesses: 6,
      maxGuesses: 6,
      won: false,
      hardMode: true,
      colorblind: false,
      rows,
    });
    expect(text.split("\n")[0]).toBe("Wordlelo 521 X/6*");
  });

  it("renders the standard emoji grid", () => {
    const text = buildShareText({
      day: 1,
      guesses: 2,
      maxGuesses: 6,
      won: true,
      hardMode: false,
      colorblind: false,
      rows,
    });
    expect(text).toContain("🟩🟨⬜⬜⬜");
    expect(text).toContain("🟩🟩🟩🟩🟩");
  });

  it("uses the colorblind palette when enabled", () => {
    const text = buildShareText({
      day: 1,
      guesses: 2,
      maxGuesses: 6,
      won: true,
      hardMode: false,
      colorblind: true,
      rows,
    });
    expect(text).toContain("🟧🟦⬜⬜⬜");
  });

  it("never leaks letters in the grid", () => {
    const text = buildShareText({
      day: 1,
      guesses: 2,
      maxGuesses: 6,
      won: true,
      hardMode: false,
      colorblind: false,
      rows,
    });
    const grid = text.split("\n").slice(1).join("");
    expect(/[a-z]/i.test(grid)).toBe(false);
  });
});
