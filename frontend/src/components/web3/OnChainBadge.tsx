import { CELO_MAINNET, WORDLE_GAME_ADDRESS } from "@/lib/web3/contract";
import { explorerAddressUrl } from "@/lib/web3/network";

export function OnChainBadge() {
  return (
    <a
      href={explorerAddressUrl(CELO_MAINNET, WORDLE_GAME_ADDRESS)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-medium text-correct underline underline-offset-2"
    >
      Verified contract on Celoscan ↗
    </a>
  );
}
