"use client";

import { useEffect, useState } from "react";
import { formatCountdown, msUntil } from "@/lib/game/day";

export function useCountdown(closesAt: string | null): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!closesAt) {
      setLabel(null);
      return;
    }
    const update = () =>
      setLabel(formatCountdown(msUntil(closesAt, Date.now())));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [closesAt]);

  return label;
}
