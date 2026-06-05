"use client";

import { useConnect, useDisconnect } from "wagmi";
import { useMiniPay } from "@/hooks/useMiniPay";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { isMiniPay, isConnected, address } = useMiniPay();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        aria-label="Disconnect wallet"
        className="rounded bg-key px-2 py-1 font-mono text-xs text-key-text"
      >
        {truncate(address)}
      </button>
    );
  }

  if (isMiniPay) {
    return null;
  }

  const injectedConnector = connectors.find((c) => c.type === "injected");
  return (
    <button
      type="button"
      onClick={() => {
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      }}
      className="rounded bg-correct px-3 py-1 text-xs font-semibold text-tile-text"
    >
      Connect
    </button>
  );
}
