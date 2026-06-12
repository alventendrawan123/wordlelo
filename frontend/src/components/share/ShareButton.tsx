"use client";

import { useState } from "react";
import { buildShareText, type ShareOptions } from "@/lib/game/share";

export interface ShareButtonProps {
  options: ShareOptions;
}

export function ShareButton({ options }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url =
      options.url ??
      (typeof window === "undefined" ? undefined : window.location.origin);
    const text = buildShareText({ ...options, url });
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="rounded-md bg-correct px-5 py-2 font-semibold uppercase tracking-wide text-tile-text"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
