"use client";

import { useCountdown } from "@/hooks/useCountdown";

export interface CountdownProps {
  closesAt: string | null;
}

export function Countdown({ closesAt }: CountdownProps) {
  const label = useCountdown(closesAt);

  if (!label) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-foreground/60">
        Next Wordlelo
      </span>
      <span className="text-2xl font-bold tabular-nums">{label}</span>
    </div>
  );
}
