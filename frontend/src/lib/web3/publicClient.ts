import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

export const celoPublicClient = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});
