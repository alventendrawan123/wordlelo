export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export type LetterState = "correct" | "present" | "absent";

export type TileState = "empty" | "filled" | LetterState;

export type GameState = "not_started" | "in_progress" | "won" | "lost";

export interface GuessRow {
  guess: string;
  marks: LetterState[] | null;
}

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: number[];
}

export interface Settings {
  theme: "light" | "dark" | "system";
  colorblind: boolean;
  hardMode: boolean;
}
