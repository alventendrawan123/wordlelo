import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { config } from "./config.js";
import { registerErrorHandler } from "./errors.js";
import { attestationRoutes } from "./routes/attestation.js";
import { puzzleRoutes } from "./routes/puzzle.js";
import { statsRoutes } from "./routes/stats.js";

/**
 * Build the Wordlelo backend (Celo) Fastify app.
 *
 * No network side effects — so it can be inject/unit-tested. Routes: `/health`
 * and the `/api/v1/puzzle/*` game API. The listen entrypoint lives in index.ts.
 * The SETTLER attestation signer + SIWE auth land in follow-up work.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: config.corsOrigin });
  registerErrorHandler(app);

  app.get("/health", async () => ({
    status: "ok",
    service: "wordlelo-be",
    chain: "celo",
  }));

  app.register(puzzleRoutes, { prefix: "/api/v1/puzzle" });
  app.register(attestationRoutes, { prefix: "/api/v1/puzzle" });
  app.register(statsRoutes, { prefix: "/api/v1" });

  return app;
}
