import Fastify, { type FastifyInstance } from "fastify";

/**
 * Build the Wordlelo backend (Celo) Fastify app.
 *
 * No network side effects — so it can be inject/unit-tested. The listen
 * entrypoint lives in index.ts. Upcoming PRs add the 2-pass scoring engine,
 * daily-word commit/reveal management, and the SETTLER attestation signer
 * that authorizes on-chain `submitResult` for the Celo contract.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "wordlelo-be",
    chain: "celo",
  }));

  return app;
}
