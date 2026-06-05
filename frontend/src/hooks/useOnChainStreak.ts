"use client";

import { useEffect, useState } from "react";
import { WORDLE_GAME_ADDRESS, wordleGameAbi } from "@/lib/web3/contract";
import { celoPublicClient } from "@/lib/web3/publicClient";

export interface OnChainStreak {
  current: number;
  max: number;
}

export function useOnChainStreak(
  address: `0x${string}` | undefined,
): OnChainStreak | null {
  const [streak, setStreak] = useState<OnChainStreak | null>(null);

  useEffect(() => {
    if (!address) {
      setStreak(null);
      return;
    }
    let active = true;
    celoPublicClient
      .readContract({
        address: WORDLE_GAME_ADDRESS,
        abi: wordleGameAbi,
        functionName: "getStreak",
        args: [address],
      })
      .then((result) => {
        if (active) {
          setStreak({ current: result.current, max: result.max });
        }
      })
      .catch(() => {
        if (active) {
          setStreak(null);
        }
      });
    return () => {
      active = false;
    };
  }, [address]);

  return streak;
}
