import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/wordle", () => ({
  gameApi: {
    getDailyPuzzle: () =>
      Promise.resolve({
        day: 1,
        wordLength: 5,
        maxGuesses: 6,
        hardModeAllowed: true,
        opensAt: "2026-01-01T00:00:00.000Z",
        closesAt: "2026-01-02T00:00:00.000Z",
        commitment: "0x",
      }),
    submitGuess: ({ guess }: { guess: string }) => {
      const won = guess.toUpperCase() === "CRANE";
      const marks = won
        ? ["correct", "correct", "correct", "correct", "correct"]
        : ["absent", "absent", "absent", "absent", "absent"];
      return Promise.resolve({ marks, won });
    },
    getAttestation: () =>
      Promise.resolve({
        attestation: {
          player: "0x0",
          day: 1,
          guesses: 0,
          won: false,
          hardMode: false,
          contract: "0x0",
          chainId: 42220,
          signature: "0x",
        },
        tx: { functionName: "submitResult", args: [] },
      }),
  },
}));

import { useWordleGame } from "./useWordleGame";

describe("useWordleGame", () => {
  it("loads the daily puzzle", async () => {
    const { result } = renderHook(() => useWordleGame());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.puzzle?.day).toBe(1);
    expect(result.current.gameState).toBe("in_progress");
  });

  it("types and submits a winning guess", async () => {
    const { result } = renderHook(() => useWordleGame());
    await waitFor(() => expect(result.current.loading).toBe(false));

    for (const ch of "CRANE") {
      act(() => result.current.handleKey(ch));
    }
    expect(result.current.current).toBe("CRANE");

    await act(async () => {
      result.current.handleKey("Enter");
    });

    await waitFor(() => expect(result.current.gameState).toBe("won"));
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].guess).toBe("CRANE");
    expect(result.current.rows[0].marks).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
    expect(result.current.current).toBe("");
  });

  it("rejects a too-short guess without adding a row", async () => {
    const { result } = renderHook(() => useWordleGame());
    await waitFor(() => expect(result.current.loading).toBe(false));

    for (const ch of "CR") {
      act(() => result.current.handleKey(ch));
    }
    await act(async () => {
      result.current.handleKey("Enter");
    });

    await waitFor(() =>
      expect(result.current.message?.text).toBe("Not enough letters"),
    );
    expect(result.current.rows).toHaveLength(0);
  });
});
