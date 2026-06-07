import {
  bigint,
  boolean,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * On-chain `ResultSubmitted` events, mirrored for fast leaderboard / history
 * queries. The chain stays the source of truth; this is a read cache populated
 * by the indexer (one row per player per day, matching the contract).
 */
export const results = pgTable(
  "results",
  {
    player: text("player").notNull(),
    day: integer("day").notNull(),
    guesses: smallint("guesses").notNull(),
    won: boolean("won").notNull(),
    hardMode: boolean("hard_mode").notNull(),
    txHash: text("tx_hash").notNull(),
    blockNumber: bigint("block_number", { mode: "number" }).notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.player, t.day] })],
);

/** Audit log of the daily commit/reveal (the word stays deterministic from the secret). */
export const dailyWords = pgTable("daily_words", {
  day: integer("day").primaryKey(),
  word: text("word").notNull(),
  salt: text("salt").notNull(),
  commitment: text("commitment").notNull(),
  commitTx: text("commit_tx"),
  revealTx: text("reveal_tx"),
});

/** Indexer cursor — last processed block per event stream. */
export const indexerState = pgTable("indexer_state", {
  key: text("key").primaryKey(),
  lastBlock: bigint("last_block", { mode: "number" }).notNull(),
});
