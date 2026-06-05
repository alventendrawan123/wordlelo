import type { Mark } from "./types.js";

/**
 * Score a guess against the answer using the canonical Wordle two-pass rule.
 *
 * Greens are assigned first and *consume* answer letters; yellows are then drawn
 * only from whatever letters remain. This is what makes duplicate letters score
 * exactly like NYT Wordle (a second copy of a letter goes gray once the answer's
 * supply is exhausted).
 *
 * Compared case-insensitively. Throws if the lengths differ.
 *
 * This is the SHARED authority: the backend uses it as the source of truth, and
 * the frontend may use it optimistically. It contains no word list and no answer.
 */
export function scoreGuess(guess: string, answer: string): Mark[] {
  if (guess.length !== answer.length) {
    throw new Error(`length mismatch: guess(${guess.length}) vs answer(${answer.length})`);
  }

  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const n = g.length;
  const marks: Mark[] = new Array<Mark>(n).fill("gray");
  const remaining = new Map<string, number>();

  // Pass 1 — greens, tallying the answer letters that greens did NOT consume.
  for (let i = 0; i < n; i++) {
    if (g[i] === a[i]) {
      marks[i] = "green";
    } else {
      remaining.set(a[i], (remaining.get(a[i]) ?? 0) + 1);
    }
  }

  // Pass 2 — yellows, drawn from the remaining (non-green) answer letters.
  for (let i = 0; i < n; i++) {
    if (marks[i] === "green") continue;
    const left = remaining.get(g[i]) ?? 0;
    if (left > 0) {
      marks[i] = "yellow";
      remaining.set(g[i], left - 1);
    }
  }

  return marks;
}
