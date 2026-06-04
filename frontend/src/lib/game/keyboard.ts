import type { LetterState } from "@/types/game";

const RANK: Record<LetterState, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

export type KeyboardState = Record<string, LetterState>;

export const KEYBOARD_ROWS: readonly (readonly string[])[] = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  ["Enter", ..."ZXCVBNM".split(""), "Backspace"],
];

export function mergeKeyStates(
  current: KeyboardState,
  guess: string,
  marks: LetterState[],
): KeyboardState {
  const next: KeyboardState = { ...current };
  const g = guess.toUpperCase();
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    const mark = marks[i];
    const existing: LetterState | undefined = next[ch];
    if (existing === undefined || RANK[mark] > RANK[existing]) {
      next[ch] = mark;
    }
  }
  return next;
}
