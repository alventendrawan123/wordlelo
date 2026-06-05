import { config } from "../config.js";
import { dayIndex } from "../daily/index.js";
import { createWordSetter, revealArgsFor } from "../onchain/wordSetter.js";

/**
 * Reveal a past day's word on-chain (after it has closed), so players can verify
 * the puzzle was fair: keccak256(word, salt) == the committed hash.
 *
 *   SERVER_SECRET=... WORD_SETTER_PRIVATE_KEY=0x... pnpm --filter @wordlelo/be reveal:day [day]
 *
 * Defaults to yesterday. Without WORD_SETTER_PRIVATE_KEY it prints the word+salt only.
 */
async function main(): Promise<void> {
  const arg = process.argv[2];
  const day = arg ? Number(arg) : dayIndex() - 1;
  const { word, salt } = revealArgsFor(day, config.serverSecret);
  console.log(`Day ${day} -> revealWord word="${word}" salt=${salt}`);

  const pk = process.env.WORD_SETTER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) {
    console.error("WORD_SETTER_PRIVATE_KEY not set — dry run, nothing broadcast.");
    return;
  }

  const ws = createWordSetter(pk, config.serverSecret, process.env.CELO_RPC_URL);
  console.log(`Broadcasting revealWord(${day}) from ${ws.address} ...`);
  const hash = await ws.reveal(day);
  console.log(`revealWord tx: https://celoscan.io/tx/${hash}`);
}

void main();
