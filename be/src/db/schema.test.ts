import { describe, expect, it } from "vitest";
import { dailyWords, indexerState, results } from "./schema.js";

describe("db schema", () => {
  it("defines results / daily_words / indexer_state with their key columns", () => {
    expect(results.player).toBeDefined();
    expect(results.day).toBeDefined();
    expect(results.won).toBeDefined();
    expect(dailyWords.commitment).toBeDefined();
    expect(indexerState.lastBlock).toBeDefined();
  });
});
