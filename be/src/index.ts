import { config } from "./config.js";
import { buildServer } from "./server.js";

/** Entrypoint: build the Celo backend app and start listening. */
async function main(): Promise<void> {
  const app = buildServer();
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
