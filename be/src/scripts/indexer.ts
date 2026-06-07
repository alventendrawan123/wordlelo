import "dotenv/config";
import { CELO_MAINNET, deployments } from "@wordlelo/contracts";
import { config } from "../config.js";
import { getDb } from "../db/index.js";
import { runIndexer } from "../indexer/index.js";
import { createCeloPublicClient } from "../onchain/publicClient.js";

/**
 * Indexer runner. Catches up from the contract's deploy block (or the stored
 * cursor) and then polls. Pass --once to backfill and exit.
 *
 *   pnpm --filter @wordlelo/be indexer        # run + poll
 *   pnpm --filter @wordlelo/be indexer:once   # backfill once and exit
 */
async function main(): Promise<void> {
  if (!config.databaseUrl) {
    console.error("DATABASE_URL is required to run the indexer");
    process.exit(1);
  }

  const db = getDb(config.databaseUrl);
  const client = createCeloPublicClient(config.celoRpcUrl);
  const startBlock = BigInt(deployments[CELO_MAINNET].deployBlock);
  const once = process.argv.includes("--once");

  console.log(`[indexer] starting (startBlock=${startBlock}, once=${once})`);
  await runIndexer(db, client, { startBlock, once });
  // Only reached in --once mode (poll mode loops forever); close the open DB pool.
  console.log("[indexer] caught up.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[indexer] fatal:", err);
  process.exit(1);
});
