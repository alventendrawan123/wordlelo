import { describe, expect, it } from "vitest";
import { dayIndex, wordForDay } from "../daily/index.js";
import { buildServer } from "../server.js";

describe("GET /api/v1/puzzle/today", () => {
  it("returns puzzle meta + a 32-byte commitment, never the word", async () => {
    const app = buildServer();
    const res = await app.inject({ method: "GET", url: "/api/v1/puzzle/today" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.wordLength).toBe(5);
    expect(body.maxGuesses).toBe(6);
    expect(body.hardModeAllowed).toBe(true);
    expect(typeof body.day).toBe("number");
    expect(body.commitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(JSON.stringify(body)).not.toContain(wordForDay(dayIndex()));
    await app.close();
  });
});

describe("POST /api/v1/puzzle/today/guess", () => {
  it("scores a valid word and detects a win on the exact answer", async () => {
    const app = buildServer();
    const answer = wordForDay(dayIndex());
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/puzzle/today/guess",
      payload: { guess: answer, hardMode: false },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.marks).toEqual(["correct", "correct", "correct", "correct", "correct"]);
    expect(body.won).toBe(true);
    expect(body.guess).toBe(answer);
    await app.close();
  });

  it("rejects a too-short guess with INVALID_GUESS (400)", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/puzzle/today/guess",
      payload: { guess: "ABC" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_GUESS");
    await app.close();
  });

  it("rejects a non-dictionary word with NOT_IN_WORD_LIST (422)", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/puzzle/today/guess",
      payload: { guess: "ZZZZZ" },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe("NOT_IN_WORD_LIST");
    await app.close();
  });
});
