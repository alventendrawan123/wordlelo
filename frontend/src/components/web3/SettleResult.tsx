"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useSubmitResult } from "@/hooks/useSubmitResult";
import { USE_REAL_BE } from "@/lib/api/client";
import { isGameApiError } from "@/lib/api/errors";
import { gameApi } from "@/lib/api/wordle";
import { ExplorerTxLink } from "./ExplorerTxLink";

export function SettleResult() {
  const { isConnected, chainId } = useAccount();
  const { submit, isPending } = useSubmitResult();
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isConnected) {
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
      const { attestation } = await gameApi.getAttestation();
      setHash(await submit(attestation));
    } catch (err) {
      setError(isGameApiError(err) ? err.message : "Could not settle on-chain");
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
