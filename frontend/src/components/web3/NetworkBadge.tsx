"use client";

import { useAccount } from "wagmi";
import { chainName, isSupportedChain } from "@/lib/web3/network";

export function NetworkBadge() {
  const { isConnected, chainId } = useAccount();

  if (!isConnected) {
    return null;
  }

  return (
    <span
      className={`text-xs ${isSupportedChain(chainId) ? "text-foreground/60" : "font-semibold text-present"}`}
    >
      {chainName(chainId)}
    </span>
  );
}
