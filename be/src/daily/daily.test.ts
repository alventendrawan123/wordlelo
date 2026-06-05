import { encodePacked, keccak256 } from "viem";
import { describe, expect, it } from "vitest";
import {
  commitmentForDay,
  dayIndex,
  isAllowedGuess,
  saltForDay,
  scoreForDay,
  wordForDay,
} from "./daily.js";
import { ALLOWED_SET, ANSWERS } from "./words.js";

describe("word lists", () => {
  it("answer pool is sizeable, 5 uppercase letters, never ends in S", () => {
    expect(ANSWERS.length).toBeGreaterThan(100);
    for (const w of ANSWERS) {
      expect(w).toMatch(/^[A-Z]{5}$/);
      expect(w.endsWith("S")).toBe(false);
    }
  });

  it("every answer is also an accepted guess", () => {
    for (const w of ANSWERS) expect(ALLOWED_SET.has(w)).toBe(true);
  });
});

describe("day scheme", () => {
  it("matches the frontend epoch (2025-01-01 UTC)", () => {
    expect(dayIndex(Date.UTC(2025, 0, 1))).toBe(0);
    expect(dayIndex(Date.UTC(2025, 0, 2))).toBe(1);
    expect(dayIndex(Date.UTC(2026, 0, 1))).toBe(365);
  });
});

describe("wordForDay", () => {
  it("is deterministic and wraps around the pool", () => {
    expect(wordForDay(7)).toBe(wordForDay(7));
    expect(wordForDay(0)).toBe(wordForDay(ANSWERS.length));
    expect(wordForDay(-1)).toBe(wordForDay(ANSWERS.length - 1));
  });
});

describe("isAllowedGuess", () => {
  it("accepts dictionary words case-insensitively, rejects junk", () => {
    const sample = (ANSWERS[0] as string).toLowerCase();
    expect(isAllowedGuess(sample)).toBe(true);
    expect(isAllowedGuess("ZZZZZ")).toBe(false);
    expect(isAllowedGuess("ABC")).toBe(false);
  });
});

describe("commit–reveal", () => {
  it("commitment equals keccak256(abi.encodePacked(word, salt)) — matches the contract", () => {
    const day = 521;
    const secret = "test-secret";
    const salt = saltForDay(day, secret);
    const expected = keccak256(encodePacked(["string", "bytes32"], [wordForDay(day), salt]));
    expect(commitmentForDay(day, secret)).toBe(expected);
  });

  it("salt is deterministic per (secret, day) and depends on both", () => {
    expect(saltForDay(1, "a")).toBe(saltForDay(1, "a"));
    expect(saltForDay(1, "a")).not.toBe(saltForDay(1, "b"));
    expect(saltForDay(1, "a")).not.toBe(saltForDay(2, "a"));
  });
});

describe("scoreForDay", () => {
  it("maps to correct/present/absent and detects a win", () => {
    const day = 521;
    const marks = scoreForDay(day, wordForDay(day));
    expect(marks).toEqual(["correct", "correct", "correct", "correct", "correct"]);

    for (const m of scoreForDay(day, "AAAAA")) {
      expect(["correct", "present", "absent"]).toContain(m);
    }
  });
});
