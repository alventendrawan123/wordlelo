import { type WordleChainId, deployments } from "./deployments.js";

export { wordleGameAbi } from "./abi.js";
export { deployments };
export type { WordleChainId };

/** Celo mainnet chain id. */
export const CELO_MAINNET = 42220 as const;

/** WordleGame proxy address on Celo mainnet — the canonical contract to call. */
export const WORDLE_GAME_ADDRESS = deployments[CELO_MAINNET].proxy;

/** WordleGame proxy address for any supported chain. */
export function wordleGameAddress(chainId: WordleChainId): `0x${string}` {
  return deployments[chainId].proxy;
}
