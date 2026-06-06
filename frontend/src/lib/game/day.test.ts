import { describe, expect, it } from "vitest";
import { dayStorageKey, formatCountdown, msUntil } from "./day";

describe("dayStorageKey", () => {
  it("namespaces the key per day", () => {
    expect(dayStorageKey(521)).toBe("wordlelo:game:521");
  });
});

describe("formatCountdown", () => {
  it("formats milliseconds as HH:MM:SS", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(3_661_000)).toBe("01:01:01");
    expect(formatCountdown(86_399_000)).toBe("23:59:59");
  });
});

describe("msUntil", () => {
  it("returns remaining milliseconds for a future time", () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const iso = new Date(now + 5000).toISOString();
    expect(msUntil(iso, now)).toBe(5000);
  });

  it("clamps to zero for a past time", () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const iso = new Date(now - 5000).toISOString();
    expect(msUntil(iso, now)).toBe(0);
  });
});
