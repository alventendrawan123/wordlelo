"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry, PlayerResult } from "@/lib/api/schemas";
import { gameApi } from "@/lib/api/wordle";

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  results: PlayerResult[];
  loading: boolean;
  error: boolean;
}

export function useLeaderboard(player: string | undefined): LeaderboardData {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    Promise.all([
      gameApi.getLeaderboard(),
      player
        ? gameApi.getMyResults(player)
        : Promise.resolve<PlayerResult[]>([]),
    ])
      .then(([board, history]) => {
        if (active) {
          setLeaderboard(board);
          setResults(history);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [player]);

  return { leaderboard, results, loading, error };
}
