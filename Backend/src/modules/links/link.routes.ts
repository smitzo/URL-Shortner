import { Router } from "express";
import {
  analyticsController,
  createLinkController,
  getLinkController,
  redirectController,
  updateLinkStatusController
} from "@/modules/links/link.controller.js";
import { createLinkRateLimit } from "@/middleware/rate-limit.js";
import { validateRequest } from "@/middleware/validate.js";
import {
  analyticsParamSchema,
  analyticsQuerySchema,
  codeParamSchema,
  createLinkSchema,
  updateLinkStatusSchema
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
linkRouter.get(
  "/api/links/:code",
  validateRequest("params", codeParamSchema),
  getLinkController
);
linkRouter.patch(
  "/api/links/:code/status",
  validateRequest("params", codeParamSchema),
  validateRequest("body", updateLinkStatusSchema),
  updateLinkStatusController
);
linkRouter.get("/:code", validateRequest("params", codeParamSchema), redirectController);
