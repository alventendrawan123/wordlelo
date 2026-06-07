import "dotenv/config";
import { eq } from "drizzle-orm";
import type { PublicClient } from "viem";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, getDb, results } from "../db/index.js";
import { getCursor, indexRange, resultToRow, setCursor, upsertResults } from "./indexer.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const TEST_PLAYER = "0x000000000000000000000000000000000000beef";
const TEST_DAY = 990002;

describe("resultToRow (pure)", () => {
  it("maps a decoded log + block time into a row", () => {
    const row = resultToRow(
      {
        args: {
          player: "0xAbC0000000000000000000000000000000000001",
          day: 7n,
          guesses: 4,
          won: true,
          hardMode: false,
        },
        transactionHash: "0xdead",
        blockNumber: 123n,
      },
      new Date("2026-01-02T03:04:05.000Z"),
    );
    expect(row).toEqual({
      player: "0xabc0000000000000000000000000000000000001",
      day: 7,
      guesses: 4,
      won: true,
      hardMode: false,
      txHash: "0xdead",
      blockNumber: 123,
      settledAt: new Date("2026-01-02T03:04:05.000Z"),
    });
  });
});

describe.skipIf(!DATABASE_URL)("indexer (DB)", () => {
  let db: Db;

  beforeAll(async () => {
    db = getDb(DATABASE_URL);
    await db.delete(results).where(eq(results.player, TEST_PLAYER));
  });

  afterAll(async () => {
    await db.delete(results).where(eq(results.player, TEST_PLAYER));
  });

  it("upserts idempotently (re-running is a no-op)", async () => {
    const row = {
      player: TEST_PLAYER,
      day: TEST_DAY,
      guesses: 5,
      won: false,
      hardMode: true,
      txHash: "0x1",
      blockNumber: 10,
      settledAt: new Date(),
    };
    await upsertResults(db, [row]);
    await upsertResults(db, [row]); // duplicate → ignored
    const rows = await db.select().from(results).where(eq(results.player, TEST_PLAYER));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.won).toBe(false);
  });

  it("round-trips the cursor", async () => {
    await setCursor(db, 68690000);
    expect(await getCursor(db)).toBe(68690000);
    await setCursor(db, 68695000);
    expect(await getCursor(db)).toBe(68695000);
  });

  it("indexRange reads logs from the client and upserts them", async () => {
    await db.delete(results).where(eq(results.player, TEST_PLAYER));
    const mockClient = {
      getLogs: async () => [
        {
          args: {
            player: TEST_PLAYER,
            day: BigInt(TEST_DAY),
            guesses: 3,
            won: true,
            hardMode: false,
          },
          transactionHash: "0xfeed",
          blockNumber: 42n,
        },
      ],
      getBlock: async () => ({ timestamp: 1_750_000_000n }),
    } as unknown as PublicClient;

    const n = await indexRange(
      db,
      mockClient,
      "0x0000000000000000000000000000000000000000",
      1n,
      100n,
    );
    expect(n).toBe(1);
    const rows = await db.select().from(results).where(eq(results.player, TEST_PLAYER));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.day).toBe(TEST_DAY);
    expect(rows[0]?.won).toBe(true);
  });
});
