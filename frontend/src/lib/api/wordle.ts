import { evaluateGuess, isWin } from "@/lib/game/evaluate";
import { MAX_GUESSES, WORD_LENGTH } from "@/types/game";
import { fetchJson, USE_REAL_BE } from "./client";
import { DEV_DICTIONARY, devAnswerForDay } from "./devWords";
import { GameApiError } from "./errors";
import {
  type Attestation,
  attestationSchema,
  beGuessResponseSchema,
  type DailyPuzzle,
  dailyPuzzleSchema,
  type GuessResult,
  type LeaderboardEntry,
  leaderboardSchema,
  type PlayerResult,
  playerResultsSchema,
} from "./schemas";

const EPOCH_UTC = Date.UTC(2025, 0, 1);
const DAY_MS = 86_400_000;

function dayIndex(now: number): number {
  return Math.floor((now - EPOCH_UTC) / DAY_MS);
}

function utcDayBounds(now: number): { opensAt: string; closesAt: string } {
  const date = new Date(now);
  const open = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return {
    opensAt: new Date(open).toISOString(),
    closesAt: new Date(open + DAY_MS).toISOString(),
  };
}

export interface SubmitGuessRequest {
  guess: string;
  hardMode: boolean;
}

function mockGetDailyPuzzle(): Promise<DailyPuzzle> {
  const now = Date.now();
  const { opensAt, closesAt } = utcDayBounds(now);
  return Promise.resolve({
    day: dayIndex(now),
    wordLength: WORD_LENGTH,
    maxGuesses: MAX_GUESSES,
    hardModeAllowed: true,
    opensAt,
    closesAt,
    commitment: "0xmock",
  });
}

function mockSubmitGuess({ guess }: SubmitGuessRequest): Promise<GuessResult> {
  const g = guess.toUpperCase();
  if (g.length !== WORD_LENGTH || !/^[A-Z]+$/.test(g)) {
    return Promise.reject(
      new GameApiError("INVALID_GUESS", "Not enough letters"),
    );
  }
  if (!DEV_DICTIONARY.has(g)) {
    return Promise.reject(
      new GameApiError("NOT_IN_WORD_LIST", "Not in word list"),
    );
  }
  const marks = evaluateGuess(g, devAnswerForDay(dayIndex(Date.now())));
  return Promise.resolve({ marks, won: isWin(marks) });
}

export interface AttestationRequest {
  player: string;
  guesses: string[];
  hardMode: boolean;
}

function mockGetAttestation(req: AttestationRequest): Promise<Attestation> {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  return Promise.resolve({
    attestation: {
      player: req.player,
      day: dayIndex(Date.now()),
      guesses: req.guesses.length,
      won: false,
      hardMode: req.hardMode,
      contract: zeroAddress,
      chainId: 42220,
      signature: "0xmock",
    },
    tx: { functionName: "submitResult", args: [] },
  });
}

async function realGetDailyPuzzle(): Promise<DailyPuzzle> {
  const parsed = dailyPuzzleSchema.safeParse(
    await fetchJson("/api/v1/puzzle/today"),
  );
  if (!parsed.success) {
    throw new GameApiError("BAD_RESPONSE", "Malformed puzzle response");
  }
  return parsed.data;
}

async function realSubmitGuess(req: SubmitGuessRequest): Promise<GuessResult> {
  const data = await fetchJson("/api/v1/puzzle/today/guess", {
    method: "POST",
    body: JSON.stringify({ guess: req.guess, hardMode: req.hardMode }),
  });
  const parsed = beGuessResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new GameApiError("BAD_RESPONSE", "Malformed guess response");
  }
  return { marks: parsed.data.marks, won: parsed.data.won };
}

async function realGetAttestation(
  req: AttestationRequest,
): Promise<Attestation> {
  const data = await fetchJson("/api/v1/puzzle/today/attestation", {
    method: "POST",
    body: JSON.stringify({
      player: req.player,
      guesses: req.guesses,
      hardMode: req.hardMode,
    }),
  });
  const parsed = attestationSchema.safeParse(data);
  if (!parsed.success) {
    throw new GameApiError("BAD_RESPONSE", "Malformed attestation response");
  }
  return parsed.data;
}

function mockGetLeaderboard(): Promise<LeaderboardEntry[]> {
  return Promise.resolve([
    {
      player: "0x1b444313a61be61830d4983dce350a018c288600",
      played: 12,
      wins: 9,
    },
    {
      player: "0x8143c0b1442820bdf2e0efc71785c4497cadf751",
      played: 8,
      wins: 5,
    },
    {
      player: "0x31f26f77f73dbb7ac9a03415d73d46ae81cf8af1",
      played: 5,
      wins: 2,
    },
  ]);
}

function mockGetMyResults(_player: string): Promise<PlayerResult[]> {
  return Promise.resolve([]);
}

async function realGetLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const data = await fetchJson(`/api/v1/leaderboard?limit=${limit}`);
  const parsed = leaderboardSchema.safeParse(data);
  if (!parsed.success) {
    throw new GameApiError("BAD_RESPONSE", "Malformed leaderboard response");
  }
  return parsed.data.leaderboard;
}

async function realGetMyResults(player: string): Promise<PlayerResult[]> {
  const data = await fetchJson(
    `/api/v1/me/results?player=${player.toLowerCase()}`,
  );
  const parsed = playerResultsSchema.safeParse(data);
  if (!parsed.success) {
    throw new GameApiError("BAD_RESPONSE", "Malformed results response");
  }
  return parsed.data.results;
}

export const gameApi = {
  getDailyPuzzle: USE_REAL_BE ? realGetDailyPuzzle : mockGetDailyPuzzle,
  submitGuess: USE_REAL_BE ? realSubmitGuess : mockSubmitGuess,
  getAttestation: USE_REAL_BE ? realGetAttestation : mockGetAttestation,
  getLeaderboard: USE_REAL_BE ? realGetLeaderboard : mockGetLeaderboard,
  getMyResults: USE_REAL_BE ? realGetMyResults : mockGetMyResults,
};
