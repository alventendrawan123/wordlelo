"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
