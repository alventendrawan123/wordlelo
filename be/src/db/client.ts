import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

/**
 * Create a Drizzle client over a Postgres (Supabase) connection.
 *
 * `prepare: false` is needed for Supabase's transaction-mode connection pooler
 * (pgBouncer). Use the pooled connection string in serverless/deployed envs.
 */
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
