import { type Db, createDb } from "./client.js";

export { type Db, createDb } from "./client.js";
export { dailyWords, indexerState, results } from "./schema.js";

let cached: Db | undefined;

/** Lazily create + cache a shared DB client for the given connection string. */
export function getDb(databaseUrl: string): Db {
  if (!cached) cached = createDb(databaseUrl);
  return cached;
}
