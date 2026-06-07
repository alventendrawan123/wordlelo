import { http, type PublicClient, createPublicClient } from "viem";
import { celo } from "viem/chains";

/** Read-only Celo client used by the indexer to read on-chain events. */
export function createCeloPublicClient(rpcUrl?: string): PublicClient {
  return createPublicClient({ chain: celo, transport: http(rpcUrl) }) as PublicClient;
}
