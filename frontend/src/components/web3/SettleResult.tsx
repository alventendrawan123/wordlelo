"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { useSubmitResult } from "@/hooks/useSubmitResult";
import { USE_REAL_BE } from "@/lib/api/client";
import { isGameApiError } from "@/lib/api/errors";
import { gameApi } from "@/lib/api/wordle";
import { CELO_MAINNET } from "@/lib/web3/contract";
import { ExplorerTxLink } from "./ExplorerTxLink";

export interface SettleResultProps {
  guesses: string[];
  hardMode: boolean;
}

/**
 * Pull a human-readable message out of a wagmi/viem error instead of swallowing it.
 * Without this the user (and we) only ever saw "Could not settle on-chain", which
 * hides the real cause — wrong network, user rejection, insufficient gas, revert, …
 */
function settleErrorMessage(err: unknown): string {
  if (isGameApiError(err)) {
    return err.message;
  }
  if (err && typeof err === "object") {
    const e = err as { shortMessage?: string; message?: string };
    if (e.shortMessage) return e.shortMessage;
    if (e.message) return e.message;
  }
  return "Could not settle on-chain";
}

export function SettleResult({ guesses, hardMode }: SettleResultProps) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { submit, isPending } = useSubmitResult();
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isConnected || !address) {
    return null;
  }

  if (!USE_REAL_BE) {
    return (
      <p className="text-xs text-foreground/60">
        On-chain settlement opens when the backend is live.
      </p>
    );
  }

  if (hash) {
    return <ExplorerTxLink chainId={chainId} hash={hash} />;
  }

  const handleSettle = async () => {
    setError(null);
    try {
      // The WordleGame contract only exists on Celo mainnet (42220), so the wallet
      // must be on that chain before the write. A wallet left on any other network
      // (a common case on desktop) otherwise fails the write with an opaque error.
      if (chainId !== CELO_MAINNET) {
        await switchChainAsync({ chainId: CELO_MAINNET });
      }
      const { attestation } = await gameApi.getAttestation({
        player: address,
        guesses,
        hardMode,
      });
      setHash(await submit(attestation));
    } catch (err) {
      setError(settleErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => void handleSettle()}
        className="rounded-md bg-correct px-4 py-2 text-sm font-semibold text-tile-text disabled:opacity-50"
      >
        {isPending ? "Settling…" : "Settle on Celo"}
      </button>
      {error ? <span className="text-xs text-present">{error}</span> : null}
    </div>
  );
}
