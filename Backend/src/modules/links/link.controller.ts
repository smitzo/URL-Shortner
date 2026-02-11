import type { Request, Response } from "express";
import { env } from "@/config/env.js";
import { asyncHandler } from "@/utils/async-handler.js";
import { sendSuccess } from "@/utils/http-response.js";
import { buildClickContext } from "@/modules/links/request-context.js";
import type {
  AnalyticsExportQuery,
  AnalyticsQuery,
  CreateLinkInput,
  UpdateLinkMetadataInput,
  UpdateLinkStatusInput
} from "@/modules/links/link.schemas.js";
import {
  createLink,
  getAnalyticsExportRows,
  getAdminLinkSummary,
  getAnalytics,
  getPublicLink,
  getRedirectLink,
  recordClick,
  updateLinkMetadata,
  updateLinkStatus
} from "@/modules/links/link.service.js";
import { publicLink } from "@/modules/links/link.presenter.js";
import { toCsv } from "@/utils/csv.js";

function getAdminKey(req: Request) {
  const headerKey = req.header("x-admin-key");
  const queryKey = typeof req.query.adminKey === "string" ? req.query.adminKey : undefined;
  return headerKey || queryKey;
}

type CodeParams = { code: string };
type CreateLinkRequest = Request<Record<string, never>, unknown, CreateLinkInput>;
type AnalyticsRequest = Request<CodeParams>;
type AnalyticsExportRequest = Request<CodeParams>;
type RedirectRequest = Request<CodeParams>;
type UpdateStatusRequest = Request<CodeParams, unknown, UpdateLinkStatusInput>;
type UpdateMetadataRequest = Request<CodeParams, unknown, UpdateLinkMetadataInput>;

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

export const analyticsExportController = asyncHandler(
  async (req: AnalyticsExportRequest, res: Response) => {
    const query = req.query as unknown as AnalyticsExportQuery;
    const rows = await getAnalyticsExportRows(req.params.code, getAdminKey(req), query);
    const csv = toCsv(
      rows.map((row) => ({
        id: row.id,
        clickedAt: row.clickedAt,
        referer: row.referer,
        browser: row.browser,
        os: row.os,
        device: row.device,
        country: row.country,
        city: row.city
      }))
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.code}-clicks.csv"`);
    res.status(200).send(csv);
  }
);

export const getLinkController = asyncHandler(async (req: RedirectRequest, res: Response) => {
  const link = await getPublicLink(req.params.code);

  sendSuccess(res, publicLink(link));
});

export const adminLinkSummaryController = asyncHandler(
  async (req: RedirectRequest, res: Response) => {
    const summary = await getAdminLinkSummary(req.params.code, getAdminKey(req));

    sendSuccess(res, {
      link: publicLink(summary.link),
      totalClicks: summary.totalClicks,
      lastClickedAt: summary.lastClickedAt
    });
  }
);

export const updateLinkStatusController = asyncHandler(
  async (req: UpdateStatusRequest, res: Response) => {
    const link = await updateLinkStatus(req.params.code, getAdminKey(req), req.body);

    sendSuccess(res, publicLink(link));
  }
);

export const updateLinkMetadataController = asyncHandler(
  async (req: UpdateMetadataRequest, res: Response) => {
    const link = await updateLinkMetadata(req.params.code, getAdminKey(req), req.body);

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
