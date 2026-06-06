import { describe, expect, it } from "vitest";
import { type KeyboardState, mergeKeyStates } from "./keyboard";

describe("mergeKeyStates", () => {
  it("adds the statuses from a guess", () => {
    const next = mergeKeyStates({}, "CRANE", [
      "correct",
      "present",
      "absent",
      "absent",
      "absent",
    ]);
    expect(next.C).toBe("correct");
    expect(next.R).toBe("present");
    expect(next.A).toBe("absent");
  });

  it("upgrades a letter to a better status", () => {
    const current: KeyboardState = { A: "absent" };
    const next = mergeKeyStates(current, "AXXXX", [
      "correct",
      "absent",
      "absent",
      "absent",
      "absent",
    ]);
    expect(next.A).toBe("correct");
  });

  it("never downgrades a letter (green stays green)", () => {
    const current: KeyboardState = { A: "correct" };
    const next = mergeKeyStates(current, "AXXXX", [
      "absent",
      "absent",
      "absent",
      "absent",
      "absent",
    ]);
    expect(next.A).toBe("correct");
  });

  it("does not mutate the input map", () => {
    const current: KeyboardState = { A: "absent" };
    mergeKeyStates(current, "AXXXX", [
      "correct",
      "absent",
      "absent",
      "absent",
      "absent",
    ]);
    expect(current.A).toBe("absent");
  });
});
