import { z } from "zod";

export const letterStateSchema = z.enum(["correct", "present", "absent"]);

export const dailyPuzzleSchema = z.object({
  day: z.number().int(),
  wordLength: z.number().int(),
  maxGuesses: z.number().int(),
  hardModeAllowed: z.boolean(),
  opensAt: z.string(),
  closesAt: z.string(),
  commitment: z.string(),
});
export type DailyPuzzle = z.infer<typeof dailyPuzzleSchema>;

export const guessResultSchema = z.object({
  marks: z.array(letterStateSchema),
  won: z.boolean(),
});
export type GuessResult = z.infer<typeof guessResultSchema>;

export const beGuessResponseSchema = z.object({
  day: z.number().int(),
  guess: z.string(),
  marks: z.array(letterStateSchema),
  guessesUsed: z.number().int(),
  remaining: z.number().int(),
  completed: z.boolean(),
  won: z.boolean(),
});

export const attestationSchema = z.object({
  attestation: z.object({
    player: z.string(),
    day: z.number().int(),
    guesses: z.number().int(),
    won: z.boolean(),
    hardMode: z.boolean(),
    contract: z.string(),
    chainId: z.number().int(),
    signature: z.string(),
  }),
  tx: z.object({
    functionName: z.string(),
    args: z.array(z.unknown()),
  }),
});
export type Attestation = z.infer<typeof attestationSchema>;
