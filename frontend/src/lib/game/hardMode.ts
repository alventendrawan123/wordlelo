import type { GuessRow } from "@/types/game";
import { WORD_LENGTH } from "@/types/game";

export interface HardModeViolation {
  message: string;
}

export function checkHardMode(
  guess: string,
  previousRows: GuessRow[],
): HardModeViolation | null {
  const g = guess.toUpperCase();
  for (const row of previousRows) {
    if (!row.marks) {
      continue;
    }
    const prev = row.guess.toUpperCase();
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (row.marks[i] === "correct" && g[i] !== prev[i]) {
        return { message: `Letter ${i + 1} must be ${prev[i]}` };
      }
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (row.marks[i] === "present" && !g.includes(prev[i])) {
        return { message: `Guess must contain ${prev[i]}` };
      }
    }
  }
  return null;
}
