"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";

function detectMiniPay(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.ethereum?.isMiniPay) {
    return true;
  }
  return new URLSearchParams(window.location.search).has("minipay");
}

export function useMiniPay() {
  const { isConnected, address, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const [isMiniPay, setIsMiniPay] = useState(false);

  useEffect(() => {
    setIsMiniPay(detectMiniPay());
  }, []);

  useEffect(() => {
    if (!isMiniPay || isConnected) {
      return;
    }
    const injectedConnector = connectors.find((c) => c.type === "injected");
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  }, [isMiniPay, isConnected, connect, connectors]);

  return { isMiniPay, isConnected, address, chainId };
}
