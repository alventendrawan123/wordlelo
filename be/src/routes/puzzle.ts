import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import {
  MAX_GUESSES,
  WORD_LENGTH,
  commitmentForDay,
  dayBounds,
  dayIndex,
  isAllowedGuess,
  scoreForDay,
} from "../daily/index.js";
import { invalidGuess, notInWordList } from "../errors.js";

/** Routes under /api/v1/puzzle. */
export async function puzzleRoutes(app: FastifyInstance): Promise<void> {
  // Daily puzzle meta. Stateless; never returns the word, only its commitment.
  app.get("/today", async () => {
    const day = dayIndex();
    const { opensAt, closesAt } = dayBounds();
    return {
      day,
      wordLength: WORD_LENGTH,
      maxGuesses: MAX_GUESSES,
      hardModeAllowed: true,
      opensAt,
      closesAt,
      commitment: commitmentForDay(day, config.serverSecret),
    };
  });

  // Score one guess. Authoritative: the BE holds the word; the FE never scores in prod.
  app.post("/today/guess", async (req) => {
    const body = (req.body ?? {}) as { guess?: unknown; hardMode?: unknown };
    const guess = typeof body.guess === "string" ? body.guess.trim() : "";

    if (!/^[a-zA-Z]{5}$/.test(guess)) {
      throw invalidGuess("Not enough letters");
    }
    if (!isAllowedGuess(guess)) {
      throw notInWordList("Not in word list");
    }

    const day = dayIndex();
    const marks = scoreForDay(day, guess);
    const won = marks.every((m) => m === "correct");

    // NOTE: stateless for now — the frontend owns the board/turn count and only
    // consumes `marks` + `won`. Accurate guessesUsed / remaining / completed land
    // with per-player state + SIWE auth (see the attestation work).
    return {
      day,
      guess: guess.toUpperCase(),
      marks,
      guessesUsed: 0,
      remaining: MAX_GUESSES,
      completed: won,
      won,
    };
  });
}
