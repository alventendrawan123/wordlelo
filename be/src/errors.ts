import type { FastifyInstance } from "fastify";

/** Error codes the frontend understands (mirror of the FE `GameApiErrorCode`). */
export type ApiErrorCode =
  | "INVALID_GUESS"
  | "NOT_IN_WORD_LIST"
  | "GAME_ALREADY_COMPLETE"
  | "TOO_MANY_GUESSES"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "INTERNAL";

/** A thrown ApiError is serialized to `{ error: { code, message } }` with its status. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const invalidGuess = (message: string): ApiError =>
  new ApiError(400, "INVALID_GUESS", message);
export const notInWordList = (message: string): ApiError =>
  new ApiError(422, "NOT_IN_WORD_LIST", message);

/** Register the uniform error handler: ApiError -> typed body, anything else -> 500. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) {
      reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
      return;
    }
    req.log.error(err);
    reply.status(500).send({ error: { code: "INTERNAL", message: "Internal error" } });
  });
}
