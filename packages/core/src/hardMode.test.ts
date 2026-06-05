import { describe, expect, it } from "vitest";
import { checkHardMode } from "./hardMode.js";
import type { ScoredRow } from "./types.js";

describe("checkHardMode", () => {
  it("is ok when there are no prior rows", () => {
    expect(checkHardMode("CRANE", [])).toEqual({ ok: true });
  });

  it("requires greens to stay in position", () => {
    const rows: ScoredRow[] = [
      { guess: "CRANE", marks: ["green", "gray", "gray", "gray", "gray"] },
    ];
    expect(checkHardMode("CLOUD", rows).ok).toBe(true); // C kept at index 0
    const bad = checkHardMode("PLOUD", rows);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toMatch(/1st letter must be C/);
  });

  it("requires yellow letters to be reused somewhere", () => {
    const rows: ScoredRow[] = [
      { guess: "CRANE", marks: ["gray", "yellow", "gray", "gray", "gray"] },
    ];
    expect(checkHardMode("BERRY", rows).ok).toBe(true); // contains R
    expect(checkHardMode("BOLTS", rows).ok).toBe(false); // no R
  });

  it("requires the revealed minimum count for repeated letters", () => {
    // First two letters revealed yellow as E → at least two E's required.
    const rows: ScoredRow[] = [
      { guess: "EERIE", marks: ["yellow", "yellow", "gray", "gray", "gray"] },
    ];
    expect(checkHardMode("EAGER", rows).ok).toBe(true); // 2 E's
    expect(checkHardMode("EARTH", rows).ok).toBe(false); // only 1 E
  });

  it("combines green-position and yellow-presence constraints across rows", () => {
    const rows: ScoredRow[] = [
      { guess: "SLATE", marks: ["green", "gray", "gray", "yellow", "gray"] }, // S@0 green, T yellow
    ];
    expect(checkHardMode("STORM", rows).ok).toBe(true); // S@0 + has T
    expect(checkHardMode("SHORE", rows).ok).toBe(false); // S@0 ok but missing T
  });
});
