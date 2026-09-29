import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./lib/db.js";
import { logger } from "./lib/logger.js";

async function main(): Promise<void> {
  await connectDatabase();
  const server = createApp().listen(env.PORT, () => logger.info(`API listening on http://localhost:${env.PORT}/api/v1`));

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(() => {
      disconnectDatabase()
        .catch((err: unknown) => logger.error({ err }, "Error closing database"))
        .finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "Unhandled promise rejection"));

main().catch((err: unknown) => {
  logger.fatal({ err }, "Failed to start API");
  process.exit(1);
});
