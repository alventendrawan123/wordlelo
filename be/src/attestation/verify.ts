import { type ScoredRow, checkHardMode, scoreGuess } from "@wordlelo/core";
import { MAX_GUESSES, isAllowedGuess, wordForDay } from "../daily/index.js";
import { ApiError } from "../errors.js";

export interface CompletionResult {
  won: boolean;
  guessesUsed: number;
}

/**
 * Re-derive (won, guessesUsed) from the player's full guess sequence by re-scoring
 * it server-side against the day's word. This is the anti-cheat core: a forged win
 * fails because only the backend holds the answer. Stateless — no session required.
 *
 * A submission is "complete" when either the last guess is the answer (a win, in
 * 1..6 tries) or all 6 guesses were used without a win (a loss).
 */
export function verifyCompletion(
  day: number,
  guesses: string[],
  hardMode: boolean,
): CompletionResult {
  if (guesses.length < 1 || guesses.length > MAX_GUESSES) {
    throw new ApiError(400, "BAD_REQUEST", "guesses must contain 1..6 entries");
  }

  const word = wordForDay(day);
  const rows: ScoredRow[] = [];
  let winIndex = -1;

  for (let i = 0; i < guesses.length; i++) {
    const g = guesses[i];
    if (typeof g !== "string" || !isAllowedGuess(g)) {
      throw new ApiError(422, "NOT_IN_WORD_LIST", `guess ${i + 1} is not an accepted word`);
    }
    if (hardMode && i > 0) {
      const hm = checkHardMode(g, rows);
      if (!hm.ok) throw new ApiError(400, "INVALID_GUESS", `hard mode: ${hm.reason}`);
    }
    const marks = scoreGuess(g, word);
    if (winIndex === -1 && marks.every((m) => m === "green")) winIndex = i;
    rows.push({ guess: g.toUpperCase(), marks });
  }

  if (winIndex !== -1) {
    if (winIndex !== guesses.length - 1) {
      throw new ApiError(400, "BAD_REQUEST", "extra guesses submitted after a win");
    }
    return { won: true, guessesUsed: guesses.length };
  }

  if (guesses.length !== MAX_GUESSES) {
    throw new ApiError(400, "BAD_REQUEST", "game is not complete (no win, fewer than 6 guesses)");
  }
  return { won: false, guessesUsed: MAX_GUESSES };
}
