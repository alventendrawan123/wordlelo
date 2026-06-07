import { desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { getDb, results } from "../db/index.js";
import { ApiError } from "../errors.js";

function requireDb() {
  if (!config.databaseUrl) {
    throw new ApiError(503, "INTERNAL", "feature unavailable (DATABASE_URL not configured)");
  }
  return getDb(config.databaseUrl);
}

/** DB-backed leaderboard + history, under /api/v1. */
export async function statsRoutes(app: FastifyInstance): Promise<void> {
  // Aggregate leaderboard: most wins, then most played.
  app.get("/leaderboard", async (req) => {
    const db = requireDb();
    const q = req.query as { limit?: string };
    const limit = Math.min(Math.max(Number(q.limit ?? 50) || 50, 1), 100);

    const wins = sql<number>`count(*) filter (where ${results.won})::int`;
    const played = sql<number>`count(*)::int`;

    const leaderboard = await db
      .select({ player: results.player, played, wins })
      .from(results)
      .groupBy(results.player)
      .orderBy(desc(wins), desc(played))
      .limit(limit);

    return { leaderboard };
  });

  // A single player's settled-result history (newest day first).
  app.get("/me/results", async (req) => {
    const q = req.query as { player?: string };
    const player = (q.player ?? "").toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(player)) {
      throw new ApiError(400, "BAD_REQUEST", "a valid ?player= address is required");
    }

    const db = requireDb();
    const rows = await db
      .select()
      .from(results)
      .where(eq(results.player, player))
      .orderBy(desc(results.day))
      .limit(100);

    return { results: rows };
  });
}
