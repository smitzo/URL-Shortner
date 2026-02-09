import type { Request, Response } from "express";
import { env } from "@/config/env.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { sendSuccess } from "@/utils/http-response.js";
import { buildClickContext } from "@/modules/links/request-context.js";
import type {
  AnalyticsQuery,
  CreateLinkInput,
  UpdateLinkStatusInput
} from "@/modules/links/link.schemas.js";
import {
  createLink,
  getAnalytics,
  getPublicLink,
  getRedirectLink,
  recordClick,
  updateLinkStatus
} from "@/modules/links/link.service.js";
import { publicLink } from "@/modules/links/link.presenter.js";

function getAdminKey(req: Request) {
  const headerKey = req.header("x-admin-key");
  const queryKey = typeof req.query.adminKey === "string" ? req.query.adminKey : undefined;
  return headerKey || queryKey;
}

type CodeParams = { code: string };
type CreateLinkRequest = Request<Record<string, never>, unknown, CreateLinkInput>;
type AnalyticsRequest = Request<CodeParams>;
type RedirectRequest = Request<CodeParams>;
type UpdateStatusRequest = Request<CodeParams, unknown, UpdateLinkStatusInput>;

export const createLinkController = asyncHandler(async (req: CreateLinkRequest, res: Response) => {
  const { link, adminKey, shortUrl } = await createLink(req.body);

  sendSuccess(
    res,
    {
      ...publicLink(link),
      shortUrl,
      adminKey,
      analyticsUrl: `${env.WEB_BASE_URL.replace(/\/$/, "")}/analytics/${link.code}`
    },
    { status: 201 }
  );
});

export const analyticsController = asyncHandler(async (req: AnalyticsRequest, res: Response) => {
  const query = req.query as unknown as AnalyticsQuery;
  const analytics = await getAnalytics(req.params.code, getAdminKey(req), query);

  sendSuccess(res, analytics);
});

export const getLinkController = asyncHandler(async (req: RedirectRequest, res: Response) => {
  const link = await getPublicLink(req.params.code);

  sendSuccess(res, publicLink(link));
});

export const updateLinkStatusController = asyncHandler(
  async (req: UpdateStatusRequest, res: Response) => {
    const link = await updateLinkStatus(req.params.code, getAdminKey(req), req.body);

    sendSuccess(res, publicLink(link));
  }
);

export const redirectController = asyncHandler(async (req: RedirectRequest, res: Response) => {
  const link = await getRedirectLink(req.params.code);
  const clickContext = buildClickContext(req);

  void recordClick(link.id, clickContext).catch((error) => {
    req.log?.error({ error, linkId: link.id }, "Failed to record click event");
  });

  res.setHeader("Cache-Control", `private, max-age=${env.REDIRECT_CACHE_SECONDS}`);
  res.redirect(302, link.targetUrl);
});
