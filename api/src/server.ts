import "dotenv/config";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { installGracefulShutdown } from "./shutdown.js";

const app = await buildApp();

installGracefulShutdown(app);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
