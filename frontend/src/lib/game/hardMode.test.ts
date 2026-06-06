import { describe, expect, it } from "vitest";
import type { GuessRow } from "@/types/game";
import { checkHardMode } from "./hardMode";

describe("checkHardMode", () => {
  it("allows any guess when there are no previous rows", () => {
    expect(checkHardMode("CRANE", [])).toBeNull();
  });

  it("requires a revealed green to stay in its position", () => {
    const rows: GuessRow[] = [
      {
        guess: "CRANE",
        marks: ["correct", "absent", "absent", "absent", "absent"],
      },
    ];
    expect(checkHardMode("CLOUD", rows)).toBeNull();
    expect(checkHardMode("SLOTH", rows)?.message).toContain("must be C");
  });

  it("requires a revealed yellow to be reused somewhere", () => {
    const rows: GuessRow[] = [
      {
        guess: "CRANE",
        marks: ["absent", "present", "absent", "absent", "absent"],
      },
    ];
    expect(checkHardMode("ROUND", rows)).toBeNull();
    expect(checkHardMode("SLOTH", rows)?.message).toContain("contain R");
  });

  it("ignores rows that have not been evaluated", () => {
    const rows: GuessRow[] = [{ guess: "CRANE", marks: null }];
    expect(checkHardMode("SLOTH", rows)).toBeNull();
  });
});
