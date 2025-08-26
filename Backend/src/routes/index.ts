import { Router } from "express";
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

router.get("/ready", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, {
      status: "ready",
      database: "connected"
    });
  } catch (error) {
    next(error);
  }
});

router.use(linkRouter);
