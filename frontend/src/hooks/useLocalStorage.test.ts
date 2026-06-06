import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { useLocalStorage } from "./useLocalStorage";

const schema = z.object({ n: z.number() });

describe("useLocalStorage", () => {
  it("returns the initial value, then persists updates", () => {
    const { result } = renderHook(() => useLocalStorage("k", { n: 0 }, schema));
    expect(result.current[0]).toEqual({ n: 0 });

    act(() => result.current[1]({ n: 5 }));

    expect(result.current[0]).toEqual({ n: 5 });
    expect(localStorage.getItem("k")).toBe(JSON.stringify({ n: 5 }));
  });

  it("rehydrates a valid stored value", () => {
    localStorage.setItem("k", JSON.stringify({ n: 9 }));
    const { result } = renderHook(() => useLocalStorage("k", { n: 0 }, schema));
    expect(result.current[0]).toEqual({ n: 9 });
  });

  it("ignores a stored value that fails the schema", () => {
    localStorage.setItem("k", JSON.stringify({ wrong: true }));
    const { result } = renderHook(() => useLocalStorage("k", { n: 0 }, schema));
    expect(result.current[0]).toEqual({ n: 0 });
  });
});
