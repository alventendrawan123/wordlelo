import { type Mark, scoreGuess } from "@wordlelo/core";
import { type Hex, encodePacked, keccak256, toHex } from "viem";
import { ALLOWED_SET, ANSWERS } from "./words.js";

/** Letter feedback names as the frontend expects them (not core's green/yellow/gray). */
export type LetterState = "correct" | "present" | "absent";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/**
 * Day-index epoch — MUST stay in lockstep with the frontend (`Date.UTC(2025, 0, 1)`),
 * because this same integer is the `uint256 day` key used on-chain.
 */
const EPOCH_UTC = Date.UTC(2025, 0, 1);
const DAY_MS = 86_400_000;

/** Whole UTC days since the Wordlelo epoch. */
export function dayIndex(now: number = Date.now()): number {
  return Math.floor((now - EPOCH_UTC) / DAY_MS);
}

/** ISO open/close timestamps for the day containing `now`. */
export function dayBounds(now: number = Date.now()): { opensAt: string; closesAt: string } {
  const open = EPOCH_UTC + dayIndex(now) * DAY_MS;
  return {
    opensAt: new Date(open).toISOString(),
    closesAt: new Date(open + DAY_MS).toISOString(),
  };
}

/** The answer for a given day — deterministic, uppercase. */
export function wordForDay(day: number): string {
  const i = ((day % ANSWERS.length) + ANSWERS.length) % ANSWERS.length;
  const word = ANSWERS[i];
  if (word === undefined) throw new Error("empty answer pool");
  return word;
}

/** Whether a guess is an accepted dictionary word (case-insensitive, 5 letters). */
export function isAllowedGuess(guess: string): boolean {
  const g = guess.toUpperCase();
  return g.length === WORD_LENGTH && ALLOWED_SET.has(g);
}

/**
 * Per-day salt derived from a server secret, so it never has to be persisted.
 * Keeping the secret private means the published commitment never leaks the word.
 */
export function saltForDay(day: number, serverSecret: string): Hex {
  return keccak256(toHex(`${serverSecret}:${day}`));
}

/**
 * The commitment to publish on-chain via `WordleGame.commitWord`, computed exactly
 * as the contract verifies it on reveal: `keccak256(abi.encodePacked(word, salt))`.
 */
export function commitmentForDay(day: number, serverSecret: string): Hex {
  const salt = saltForDay(day, serverSecret);
  return keccak256(encodePacked(["string", "bytes32"], [wordForDay(day), salt]));
}

const MARK_TO_LETTER_STATE: Record<Mark, LetterState> = {
  green: "correct",
  yellow: "present",
  gray: "absent",
};

/** Score a guess against the day's answer, in the frontend's letter-state names. */
export function scoreForDay(day: number, guess: string): LetterState[] {
  return scoreGuess(guess, wordForDay(day)).map((m) => MARK_TO_LETTER_STATE[m]);
}
