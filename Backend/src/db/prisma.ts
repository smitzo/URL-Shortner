import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger.js";

export const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" }
  ]
});

prisma.$on("error", (event) => {
  logger.error({ event }, "Prisma client error");
});

prisma.$on("warn", (event) => {
  logger.warn({ event }, "Prisma client warning");
});

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
