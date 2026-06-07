import "dotenv/config";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, getDb, results } from "../db/index.js";
import { buildServer } from "../server.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
// Sentinel test data — never collides with real players; cleaned up afterwards.
const TEST_PLAYER = "0x000000000000000000000000000000000000dead";
const TEST_DAY = 990001;

describe.skipIf(!DATABASE_URL)("leaderboard + history (DB)", () => {
  let db: Db;
  let app: FastifyInstance;

  beforeAll(async () => {
    db = getDb(DATABASE_URL);
    app = buildServer();
    await db.delete(results).where(eq(results.player, TEST_PLAYER));
    await db.insert(results).values({
      player: TEST_PLAYER,
      day: TEST_DAY,
      guesses: 3,
      won: true,
      hardMode: false,
      txHash: "0xtest",
      blockNumber: 1,
      settledAt: new Date(),
    });
  });

  afterAll(async () => {
    await db.delete(results).where(eq(results.player, TEST_PLAYER));
    await app.close();
  });

  it("GET /me/results returns the player's settled rows", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/me/results?player=${TEST_PLAYER}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.results.some((r: { day: number }) => r.day === TEST_DAY)).toBe(true);
  });

  it("GET /me/results rejects a bad address with 400", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/me/results?player=nope" });
    expect(res.statusCode).toBe(400);
  });

  it("GET /leaderboard includes the player with a win", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/leaderboard" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const entry = body.leaderboard.find((e: { player: string }) => e.player === TEST_PLAYER);
    expect(entry?.wins).toBeGreaterThanOrEqual(1);
  });
});
