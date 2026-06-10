import { WORDLE_GAME_ADDRESS, wordleGameAbi } from "@wordlelo/contracts";
import { config } from "../config.js";
import { dayIndex } from "../daily/index.js";
import { createCeloPublicClient } from "../onchain/publicClient.js";
import { createWordSetter } from "../onchain/wordSetter.js";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Commit the daily-word hash for a rolling window of upcoming days, so players
 * can always settle today's (and the next few days') results on-chain.
 *
 * Idempotent: days already committed are read from `wordCommit[day]` and
 * skipped, so it is safe to run on a daily cron even if a previous run was
 * missed — the buffer covers the gap. Commits are sent one at a time, awaiting
 * each receipt, to keep nonces sequential.
 *
 *   SERVER_SECRET=... WORD_SETTER_PRIVATE_KEY=0x... [COMMIT_BUFFER_DAYS=14] \
 *     pnpm --filter @wordlelo/be commit:buffer
 *
 * The key must hold WORD_SETTER_ROLE on the contract and be funded for gas.
 * Use a dedicated low-privilege key — NOT the deployer/admin key.
 */
async function main(): Promise<void> {
  const pk = process.env.WORD_SETTER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) {
    console.error("WORD_SETTER_PRIVATE_KEY not set — nothing broadcast.");
    process.exit(1);
  }

  const bufferDays = Number(process.env.COMMIT_BUFFER_DAYS ?? 14);
  const rpcUrl = config.celoRpcUrl;
  const pub = createCeloPublicClient(rpcUrl);
  const ws = createWordSetter(pk, config.serverSecret, rpcUrl);
  const today = dayIndex();
  const lastDay = today + bufferDays;
  console.log(`[commit:buffer] days ${today}..${lastDay} from ${ws.address} (rpc=${rpcUrl})`);

  let committed = 0;
  let skipped = 0;
  for (let day = today; day <= lastDay; day++) {
    const existing = (await pub.readContract({
      address: WORDLE_GAME_ADDRESS,
      abi: wordleGameAbi,
      functionName: "wordCommit",
      args: [BigInt(day)],
    })) as `0x${string}`;

    if (existing !== ZERO_BYTES32) {
      skipped++;
      continue;
    }

    const hash = await ws.commit(day);
    await pub.waitForTransactionReceipt({ hash });
    console.log(`  day ${day} committed -> https://celoscan.io/tx/${hash}`);
    committed++;
  }

  console.log(`[commit:buffer] done. committed=${committed} skipped=${skipped}`);
  process.exit(0);
}

void main();
