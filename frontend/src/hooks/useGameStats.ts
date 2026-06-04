"use client";

import { useCallback } from "react";
import { z } from "zod";
import { STATS_STORAGE_KEY } from "@/lib/game/day";
import { MAX_GUESSES, type Stats } from "@/types/game";
import { useLocalStorage } from "./useLocalStorage";

const statsSchema = z.object({
  played: z.number(),
  wins: z.number(),
  currentStreak: z.number(),
  maxStreak: z.number(),
  distribution: z.array(z.number()),
});

const INITIAL_STATS: Stats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: Array.from({ length: MAX_GUESSES }, () => 0),
};

export function useGameStats() {
  const [stats, setStats] = useLocalStorage<Stats>(
    STATS_STORAGE_KEY,
    INITIAL_STATS,
    statsSchema,
  );

  const recordResult = useCallback(
    (won: boolean, guesses: number) => {
      setStats((prev) => {
        const distribution = [...prev.distribution];
        if (won && guesses >= 1 && guesses <= MAX_GUESSES) {
          distribution[guesses - 1] += 1;
        }
        const currentStreak = won ? prev.currentStreak + 1 : 0;
        return {
          played: prev.played + 1,
          wins: prev.wins + (won ? 1 : 0),
          currentStreak,
          maxStreak: Math.max(prev.maxStreak, currentStreak),
          distribution,
        };
      });
    },
    [setStats],
  );

  return { stats, recordResult };
}
