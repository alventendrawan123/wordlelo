import { WORDLE_GAME_ADDRESS, wordleGameAbi } from "@wordlelo/contracts";
import { eq } from "drizzle-orm";
import { type Address, type Hex, type PublicClient, getAbiItem } from "viem";
import { type Db, indexerState, results } from "../db/index.js";

const RESULT_EVENT = getAbiItem({ abi: wordleGameAbi, name: "ResultSubmitted" });
const CURSOR_KEY = "results";

export interface ResultRow {
  player: string;
  day: number;
  guesses: number;
  won: boolean;
  hardMode: boolean;
  txHash: string;
  blockNumber: number;
  settledAt: Date;
}

interface ResultLog {
  args: {
    player?: Address;
    day?: bigint;
    guesses?: number;
    won?: boolean;
    hardMode?: boolean;
  };
  transactionHash: Hex | null;
  blockNumber: bigint | null;
}

/** Map a decoded ResultSubmitted log (+ its block time) into a DB row. */
export function resultToRow(log: ResultLog, settledAt: Date): ResultRow {
  return {
    player: (log.args.player ?? "0x").toLowerCase(),
    day: Number(log.args.day ?? 0n),
    guesses: Number(log.args.guesses ?? 0),
    won: log.args.won === true,
    hardMode: log.args.hardMode === true,
    txHash: log.transactionHash ?? "",
    blockNumber: Number(log.blockNumber ?? 0n),
    settledAt,
  };
}

/** Idempotently insert rows (one per player+day; re-indexing an event is a no-op). */
export async function upsertResults(db: Db, rows: ResultRow[]): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(results).values(rows).onConflictDoNothing();
}

export async function getCursor(db: Db): Promise<number | null> {
  const [row] = await db
    .select()
    .from(indexerState)
    .where(eq(indexerState.key, CURSOR_KEY))
    .limit(1);
  return row ? Number(row.lastBlock) : null;
}

export async function setCursor(db: Db, block: number): Promise<void> {
  await db
    .insert(indexerState)
    .values({ key: CURSOR_KEY, lastBlock: block })
    .onConflictDoUpdate({ target: indexerState.key, set: { lastBlock: block } });
}

/** Fetch + upsert ResultSubmitted events in [fromBlock, toBlock]. Returns rows indexed. */
export async function indexRange(
  db: Db,
  client: PublicClient,
  address: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<number> {
  const logs = await client.getLogs({ address, event: RESULT_EVENT, fromBlock, toBlock });
  if (logs.length === 0) return 0;

  const tsCache = new Map<bigint, Date>();
  const rows: ResultRow[] = [];
  for (const log of logs as unknown as ResultLog[]) {
    const bn = log.blockNumber ?? 0n;
    let ts = tsCache.get(bn);
    if (!ts) {
      const block = await client.getBlock({ blockNumber: bn });
      ts = new Date(Number(block.timestamp) * 1000);
      tsCache.set(bn, ts);
    }
    rows.push(resultToRow(log, ts));
  }
  await upsertResults(db, rows);
  return rows.length;
}

export interface IndexerOptions {
  address?: Address;
  startBlock: bigint;
  batchSize?: bigint;
  pollMs?: number;
  once?: boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Catch up from the stored cursor (or startBlock), then poll for new blocks. */
export async function runIndexer(
  db: Db,
  client: PublicClient,
  opts: IndexerOptions,
): Promise<void> {
  const address = (opts.address ?? WORDLE_GAME_ADDRESS) as Address;
  const batch = opts.batchSize ?? 5_000n;
  const stored = await getCursor(db);
  let cursor = stored !== null ? BigInt(stored) : opts.startBlock - 1n;

  for (;;) {
    const latest = await client.getBlockNumber();
    while (cursor < latest) {
      const from = cursor + 1n;
      const end = from + batch - 1n;
      const to = end > latest ? latest : end;
      const n = await indexRange(db, client, address, from, to);
      cursor = to;
      await setCursor(db, Number(cursor));
      if (n > 0) console.log(`[indexer] +${n} results, cursor=${cursor}`);
    }
    if (opts.once) return;
    await sleep(opts.pollMs ?? 15_000);
  }
}
