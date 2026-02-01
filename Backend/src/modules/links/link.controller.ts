import type { Request, Response } from "express";
import { env } from "@/config/env.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { buildClickContext } from "@/modules/links/request-context.js";
import {
  analyticsParamSchema,
  analyticsQuerySchema,
  codeParamSchema,
  createLinkSchema
} from "@/modules/links/link.schemas.js";
import {
  createLink,
  getAnalytics,
  getRedirectLink,
  recordClick
} from "@/modules/links/link.service.js";
import { publicLink } from "@/modules/links/link.presenter.js";

function getAdminKey(req: Request) {
  const headerKey = req.header("x-admin-key");
  const queryKey = typeof req.query.adminKey === "string" ? req.query.adminKey : undefined;
  return headerKey || queryKey;
}

export const createLinkController = asyncHandler(async (req: Request, res: Response) => {
  const input = createLinkSchema.parse(req.body);
  const { link, adminKey, shortUrl } = await createLink(input);

  res.status(201).json({
    data: {
      ...publicLink(link),
      shortUrl,
      adminKey,
      analyticsUrl: `${env.WEB_BASE_URL.replace(/\/$/, "")}/analytics/${link.code}`
    }
  });
});

export const analyticsController = asyncHandler(async (req: Request, res: Response) => {
  const params = analyticsParamSchema.parse(req.params);
  const query = analyticsQuerySchema.parse(req.query);
  const analytics = await getAnalytics(params.code, getAdminKey(req), query);

  res.json({ data: analytics });
});

export const redirectController = asyncHandler(async (req: Request, res: Response) => {
  const params = codeParamSchema.parse(req.params);
  const link = await getRedirectLink(params.code);
  const clickContext = buildClickContext(req);

  void recordClick(link.id, clickContext).catch((error) => {
    req.log?.error({ error, linkId: link.id }, "Failed to record click event");
  });

  res.setHeader("Cache-Control", `private, max-age=${env.REDIRECT_CACHE_SECONDS}`);
  res.redirect(302, link.targetUrl);
});
