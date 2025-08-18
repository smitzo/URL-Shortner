import { Router } from "express";
import { prisma } from "@/db/prisma.js";
import { linkRouter } from "@/modules/links/link.routes.js";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "url-shortner-backend"
  });
});

router.get("/ready", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ready",
      database: "connected"
    });
  } catch (error) {
    next(error);
  }
});

router.use(linkRouter);
