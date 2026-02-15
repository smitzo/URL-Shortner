import { Router } from "express";
import { env } from "@/config/env.js";
import { prisma } from "@/db/prisma.js";
import { linkRouter } from "@/modules/links/link.routes.js";
import { sendSuccess } from "@/utils/http-response.js";

export const router = Router();

router.get("/health", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    service: "url-shortner-backend"
  });
});

router.get("/version", (_req, res) => {
  sendSuccess(res, {
    service: "url-shortner-backend",
    version: env.APP_VERSION,
    gitSha: env.GIT_SHA,
    environment: env.NODE_ENV
  });
});

router.get("/ready", async (_req, res, next) => {
  try {
    const startedAt = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const databaseLatencyMs = Math.round(performance.now() - startedAt);

    sendSuccess(res, {
      status: "ready",
      database: "connected",
      databaseLatencyMs
    });
  } catch (error) {
    next(error);
  }
});

router.use(linkRouter);
