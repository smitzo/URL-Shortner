import { Router } from "express";
import {
  analyticsController,
  createLinkController,
  redirectController
} from "@/modules/links/link.controller.js";
import { createLinkRateLimit } from "@/middleware/rate-limit.js";

export const linkRouter = Router();

linkRouter.post("/api/links", createLinkRateLimit, createLinkController);
linkRouter.get("/api/links/:code/analytics", analyticsController);
linkRouter.get("/:code", redirectController);
