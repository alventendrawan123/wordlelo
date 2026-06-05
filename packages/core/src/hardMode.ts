import type { ScoredRow } from "./types.js";

export type HardModeResult = { ok: true } | { ok: false; reason: string };

/**
 * Validate a guess against NYT-style hard mode: every revealed hint must be reused.
 * - Greens: a letter revealed green must stay in that exact position.
 * - Yellows: a letter revealed yellow (or green) must appear at least as many
 *   times as it was revealed — the strongest known minimum across prior rows.
 *
 * `revealed` is the list of previously-scored rows for the current puzzle.
 */
export function checkHardMode(guess: string, revealed: ScoredRow[]): HardModeResult {
  const g = guess.toUpperCase();

  // 1) Greens must stay in their revealed positions.
  for (const row of revealed) {
    const rg = row.guess.toUpperCase();
    for (let i = 0; i < row.marks.length; i++) {
      if (row.marks[i] === "green" && g[i] !== rg[i]) {
        return { ok: false, reason: `${ordinal(i + 1)} letter must be ${rg[i]}` };
      }
    }
  }

  // 2) Required minimum count per letter = max over rows of (green+yellow) per letter.
  const required = new Map<string, number>();
  for (const row of revealed) {
    const rg = row.guess.toUpperCase();
    const perRow = new Map<string, number>();
    for (let i = 0; i < row.marks.length; i++) {
      if (row.marks[i] === "green" || row.marks[i] === "yellow") {
        perRow.set(rg[i], (perRow.get(rg[i]) ?? 0) + 1);
      }
    }
    for (const [c, k] of perRow) {
      required.set(c, Math.max(required.get(c) ?? 0, k));
    }
  }

  const have = new Map<string, number>();
  for (const c of g) {
    have.set(c, (have.get(c) ?? 0) + 1);
  }

  for (const [c, min] of required) {
    if ((have.get(c) ?? 0) < min) {
      return { ok: false, reason: `Guess must contain ${min > 1 ? `${min} ` : ""}${c}` };
    }
  }

  return { ok: true };
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}
