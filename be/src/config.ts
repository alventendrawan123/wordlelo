/** Runtime configuration, read from the environment with safe dev defaults. */
export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? "0.0.0.0",

  /**
   * Secret used to derive per-day salts for the commit–reveal. MUST be set to a
   * strong, stable value in production — if it changes, past commitments stop
   * matching their reveals.
   */
  serverSecret: process.env.SERVER_SECRET ?? "dev-insecure-secret-change-me",

  /** Allowed CORS origin(s) for the frontend. `*` in dev; pin the FE URL in prod. */
  corsOrigin: process.env.CORS_ORIGIN ?? "*",

  /** Postgres (Supabase) connection string. Required only for the DB-backed leaderboard/history. */
  databaseUrl: process.env.DATABASE_URL ?? "",
} as const;
