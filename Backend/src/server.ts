import { createServer } from "node:http";
import { createApp } from "@/app.js";
import { env } from "@/config/env.js";
import { disconnectPrisma } from "@/db/prisma.js";
import { logger } from "@/lib/logger.js";

const app = createApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, `Backend listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received");
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
