import "dotenv/config";
import { defineConfig } from "vitest/config";

// Loading dotenv here (main process, cwd = be/) puts be/.env into process.env
// before vitest forks its workers, so DATABASE_URL is available in every worker.
export default defineConfig({
  test: {},
});
