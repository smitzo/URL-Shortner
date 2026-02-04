import { Router } from "express";
import {
  analyticsController,
  createLinkController,
  redirectController
} from "@/modules/links/link.controller.js";
import { createLinkRateLimit } from "@/middleware/rate-limit.js";
import { validateRequest } from "@/middleware/validate.js";
import {
  analyticsParamSchema,
  analyticsQuerySchema,
  codeParamSchema,
  createLinkSchema
} from "@/modules/links/link.schemas.js";

export const linkRouter = Router();

linkRouter.post(
  "/api/links",
  createLinkRateLimit,
  validateRequest("body", createLinkSchema),
  createLinkController
);
linkRouter.get(
  "/api/links/:code/analytics",
  validateRequest("params", analyticsParamSchema),
  validateRequest("query", analyticsQuerySchema),
  analyticsController
);
linkRouter.get("/:code", validateRequest("params", codeParamSchema), redirectController);
