import { Router } from "express";
import {
  adminLinkSummaryController,
  analyticsController,
  analyticsExportController,
  createLinkController,
  getLinkController,
  linkAuditController,
  redirectController,
  updateLinkMetadataController,
  updateLinkStatusController
} from "@/modules/links/link.controller.js";
import { createLinkRateLimit } from "@/middleware/rate-limit.js";
import { validateRequest } from "@/middleware/validate.js";
import {
  analyticsParamSchema,
  analyticsExportQuerySchema,
  analyticsQuerySchema,
  codeParamSchema,
  createLinkSchema,
  updateLinkMetadataSchema,
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
  "/api/links/:code/analytics/export.csv",
  validateRequest("params", analyticsParamSchema),
  validateRequest("query", analyticsExportQuerySchema),
  analyticsExportController
);
linkRouter.get(
  "/api/links/:code/admin",
  validateRequest("params", codeParamSchema),
  adminLinkSummaryController
);
linkRouter.get(
  "/api/links/:code/audit",
  validateRequest("params", codeParamSchema),
  linkAuditController
);
linkRouter.get(
  "/api/links/:code",
  validateRequest("params", codeParamSchema),
  getLinkController
);
linkRouter.patch(
  "/api/links/:code",
  validateRequest("params", codeParamSchema),
  validateRequest("body", updateLinkMetadataSchema),
  updateLinkMetadataController
);
linkRouter.patch(
  "/api/links/:code/status",
  validateRequest("params", codeParamSchema),
  validateRequest("body", updateLinkStatusSchema),
  updateLinkStatusController
);
linkRouter.get("/:code", validateRequest("params", codeParamSchema), redirectController);
