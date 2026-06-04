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
