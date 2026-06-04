import type { LetterState } from "@/types/game";

const EMOJI: Record<LetterState, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬜",
};

const EMOJI_COLORBLIND: Record<LetterState, string> = {
  correct: "🟧",
  present: "🟦",
  absent: "⬜",
};

export interface ShareOptions {
  day: number;
  guesses: number;
  maxGuesses: number;
  won: boolean;
  hardMode: boolean;
  colorblind: boolean;
  rows: LetterState[][];
}

export function buildShareText(opts: ShareOptions): string {
  const palette = opts.colorblind ? EMOJI_COLORBLIND : EMOJI;
  const score = opts.won ? String(opts.guesses) : "X";
  const hard = opts.hardMode ? "*" : "";
  const header = `Wordlelo ${opts.day} ${score}/${opts.maxGuesses}${hard}`;
  const grid = opts.rows
    .map((row) => row.map((mark) => palette[mark]).join(""))
    .join("\n");
  return `${header}\n${grid}`;
}
