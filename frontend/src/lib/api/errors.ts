export type GameApiErrorCode =
  | "INVALID_GUESS"
  | "NOT_IN_WORD_LIST"
  | "GAME_ALREADY_COMPLETE"
  | "TOO_MANY_GUESSES"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "NETWORK"
  | "BAD_RESPONSE";

export class GameApiError extends Error {
  readonly code: GameApiErrorCode;

  constructor(code: GameApiErrorCode, message: string) {
    super(message);
    this.name = "GameApiError";
    this.code = code;
  }
}

export function isGameApiError(error: unknown): error is GameApiError {
  return error instanceof GameApiError;
}

export function toErrorCode(code: string): GameApiErrorCode {
  switch (code) {
    case "INVALID_GUESS":
    case "NOT_IN_WORD_LIST":
    case "GAME_ALREADY_COMPLETE":
    case "TOO_MANY_GUESSES":
    case "UNAUTHORIZED":
    case "RATE_LIMITED":
      return code;
    default:
      return "BAD_RESPONSE";
  }
}
