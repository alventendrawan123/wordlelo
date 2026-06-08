import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/wordle", () => ({
  gameApi: {
    getLeaderboard: () =>
      Promise.resolve([
        { player: "0xaaa", played: 5, wins: 4 },
        { player: "0xbbb", played: 3, wins: 1 },
      ]),
    getMyResults: (player: string) =>
      Promise.resolve(
        player === "0xme"
          ? [
              {
                player: "0xme",
                day: 1,
                guesses: 3,
                won: true,
                hardMode: false,
                txHash: "0x1",
                blockNumber: 1,
                settledAt: "2026-01-01T00:00:00.000Z",
              },
            ]
          : [],
      ),
  },
}));

import { useLeaderboard } from "./useLeaderboard";

describe("useLeaderboard", () => {
  it("loads the leaderboard and the connected player's results", async () => {
    const { result } = renderHook(() => useLeaderboard("0xme"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(false);
    expect(result.current.leaderboard).toHaveLength(2);
    expect(result.current.leaderboard[0].wins).toBe(4);
    expect(result.current.results).toHaveLength(1);
  });

  it("skips the player's results when no wallet is connected", async () => {
    const { result } = renderHook(() => useLeaderboard(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.leaderboard).toHaveLength(2);
    expect(result.current.results).toHaveLength(0);
  });
});
