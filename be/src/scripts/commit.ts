import { config } from "../config.js";
import { dayIndex } from "../daily/index.js";
import { commitArgsFor, createWordSetter } from "../onchain/wordSetter.js";

/**
 * Commit the daily word hash on-chain. Run before a day opens so players can
 * settle results for it (submitResult requires a committed day).
 *
 *   SERVER_SECRET=... WORD_SETTER_PRIVATE_KEY=0x... pnpm --filter @wordlelo/be commit:day [day]
 *
 * Without WORD_SETTER_PRIVATE_KEY it prints the commitment only (dry run).
 */
async function main(): Promise<void> {
  const arg = process.argv[2];
  const day = arg ? Number(arg) : dayIndex();
  const { commitment } = commitArgsFor(day, config.serverSecret);
  console.log(`Day ${day} -> commitWord commitment = ${commitment}`);

  const pk = process.env.WORD_SETTER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) {
    console.error("WORD_SETTER_PRIVATE_KEY not set — dry run, nothing broadcast.");
    return;
  }

  const ws = createWordSetter(pk, config.serverSecret, process.env.CELO_RPC_URL);
  console.log(`Broadcasting commitWord(${day}) from ${ws.address} ...`);
  const hash = await ws.commit(day);
  console.log(`commitWord tx: https://celoscan.io/tx/${hash}`);
}

void main();
