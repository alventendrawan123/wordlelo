import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGameStats } from "./useGameStats";

describe("useGameStats", () => {
  it("records a win across played, wins, streak, and distribution", () => {
    const { result } = renderHook(() => useGameStats());

    act(() => result.current.recordResult(true, 3));

    expect(result.current.stats.played).toBe(1);
    expect(result.current.stats.wins).toBe(1);
    expect(result.current.stats.currentStreak).toBe(1);
    expect(result.current.stats.maxStreak).toBe(1);
    expect(result.current.stats.distribution[2]).toBe(1);
  });

  it("resets the current streak on a loss but keeps the max", () => {
    const { result } = renderHook(() => useGameStats());

    act(() => result.current.recordResult(true, 2));
    act(() => result.current.recordResult(true, 4));
    expect(result.current.stats.currentStreak).toBe(2);
    expect(result.current.stats.maxStreak).toBe(2);

    act(() => result.current.recordResult(false, 6));
    expect(result.current.stats.currentStreak).toBe(0);
    expect(result.current.stats.maxStreak).toBe(2);
    expect(result.current.stats.played).toBe(3);
    expect(result.current.stats.wins).toBe(2);
  });
});
