"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Web3Provider } from "@/components/web3/Web3Provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </Web3Provider>
  );
}
