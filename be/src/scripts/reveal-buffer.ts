import { WORDLE_GAME_ADDRESS, wordleGameAbi } from "@wordlelo/contracts";
import { config } from "../config.js";
import { dayIndex } from "../daily/index.js";
import { createCeloPublicClient } from "../onchain/publicClient.js";
import { createWordSetter } from "../onchain/wordSetter.js";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Reveal the words of recently-closed days on-chain, so anyone can verify each
 * puzzle was fair: keccak256(word, salt) == the committed hash. Only days that
 * have already CLOSED are revealed — never today's still-open puzzle, which
 * would leak the answer.
 *
 * Idempotent: days never committed, or already revealed, are skipped, so it is
 * safe to run on a daily cron — a missed run is covered on the next. Reveals are
 * sent one at a time, awaiting each receipt, to keep nonces sequential.
 *
 *   SERVER_SECRET=... WORD_SETTER_PRIVATE_KEY=0x... [REVEAL_LOOKBACK_DAYS=14] \
 *     pnpm --filter @wordlelo/be reveal:buffer
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

  const lookback = Number(process.env.REVEAL_LOOKBACK_DAYS ?? 14);
  const rpcUrl = config.celoRpcUrl;
  const pub = createCeloPublicClient(rpcUrl);
  const ws = createWordSetter(pk, config.serverSecret, rpcUrl);
  const today = dayIndex();
  const firstDay = today - lookback;
  const lastDay = today - 1; // never reveal today's open puzzle
  console.log(
    `[reveal:buffer] closed days ${firstDay}..${lastDay} from ${ws.address} (rpc=${rpcUrl})`,
  );

  let revealed = 0;
  let skipped = 0;
  for (let day = firstDay; day <= lastDay; day++) {
    const commit = (await pub.readContract({
      address: WORDLE_GAME_ADDRESS,
      abi: wordleGameAbi,
      functionName: "wordCommit",
      args: [BigInt(day)],
    })) as `0x${string}`;
    if (commit === ZERO_BYTES32) {
      skipped++;
      continue; // never committed — nothing to reveal
    }

    const alreadyRevealed = (await pub.readContract({
      address: WORDLE_GAME_ADDRESS,
      abi: wordleGameAbi,
      functionName: "isRevealed",
      args: [BigInt(day)],
    })) as boolean;
    if (alreadyRevealed) {
      skipped++;
      continue;
    }

    const hash = await ws.reveal(day);
    await pub.waitForTransactionReceipt({ hash });
    console.log(`  day ${day} revealed -> https://celoscan.io/tx/${hash}`);
    revealed++;
  }

  console.log(`[reveal:buffer] done. revealed=${revealed} skipped=${skipped}`);
  process.exit(0);
}

void main();
