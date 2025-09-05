import { LinkStatus, Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma.js";
import { AppError } from "@/lib/app-error.js";
import { assertPublicHttpUrl } from "@/utils/url.js";
import type { CreateLinkInput, AnalyticsQuery } from "@/modules/links/link.schemas.js";
import { createShortCode } from "@/modules/links/code.js";
import { createAdminKey, hashAdminKey, verifyAdminKey } from "@/modules/links/security.js";
import { shortUrlFor } from "@/modules/links/link.presenter.js";

const MAX_CODE_ATTEMPTS = 8;

function parseDateRange(query: AnalyticsQuery) {
  return {
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined
  };
}

export async function createLink(input: CreateLinkInput) {
  const targetUrl = assertPublicHttpUrl(input.targetUrl);
  const adminKey = createAdminKey();
  const adminKeyHash = hashAdminKey(adminKey);
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, "INVALID_EXPIRY", "Expiration must be in the future.");
  }

  if (input.customCode) {
    const link = await prisma.link.create({
      data: {
        code: input.customCode,
        targetUrl,
        title: input.title,
        description: input.description,
        tags: input.tags,
        expiresAt,
        adminKeyHash
      }
    });

    return { link, adminKey, shortUrl: shortUrlFor(link.code) };
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      const link = await prisma.link.create({
        data: {
          code: createShortCode(),
          targetUrl,
          title: input.title,
          description: input.description,
          tags: input.tags,
          expiresAt,
          adminKeyHash
        }
      });

      return { link, adminKey, shortUrl: shortUrlFor(link.code) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError(503, "CODE_GENERATION_FAILED", "Could not allocate a short code.");
}

export async function getRedirectLink(code: string) {
  const link = await prisma.link.findUnique({ where: { code } });

  if (!link) {
    throw new AppError(404, "LINK_NOT_FOUND", "Short link was not found.");
  }

  if (link.status !== LinkStatus.ACTIVE) {
    throw new AppError(410, "LINK_DISABLED", "Short link is no longer active.");
  }

  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
    await prisma.link.update({
      where: { id: link.id },
      data: { status: LinkStatus.EXPIRED }
    });
    throw new AppError(410, "LINK_EXPIRED", "Short link has expired.");
  }

  return link;
}

export async function getPublicLink(code: string) {
  const link = await prisma.link.findUnique({ where: { code } });

  if (!link) {
    throw new AppError(404, "LINK_NOT_FOUND", "Short link was not found.");
  }

  return link;
}

export async function recordClick(
  linkId: string,
  context: {
    ipHash?: string;
    userAgent?: string;
    referer?: string;
    browser?: string;
    os?: string;
    device?: string;
  }
) {
  await prisma.clickEvent.create({
    data: {
      linkId,
      ...context
    }
  });
}

export async function getAnalytics(code: string, adminKey: string | undefined, query: AnalyticsQuery) {
  const link = await prisma.link.findUnique({ where: { code } });

  if (!link) {
    throw new AppError(404, "LINK_NOT_FOUND", "Short link was not found.");
  }

  if (!adminKey || !verifyAdminKey(adminKey, link.adminKeyHash)) {
    throw new AppError(401, "INVALID_ADMIN_KEY", "A valid admin key is required.");
  }

  const { from, to } = parseDateRange(query);
  const clickedAt = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {})
  };
  const where = {
    linkId: link.id,
    ...(from || to ? { clickedAt } : {})
  };

  const [totalClicks, recentClicks, byBrowser, byOs, byDevice, byReferer, byDay] =
    await Promise.all([
      prisma.clickEvent.count({ where }),
      prisma.clickEvent.findMany({
        where,
        orderBy: { clickedAt: "desc" },
        take: query.limit,
        select: {
          id: true,
          clickedAt: true,
          referer: true,
          browser: true,
          os: true,
          device: true
        }
      }),
      prisma.clickEvent.groupBy({
        by: ["browser"],
        where,
        _count: { browser: true },
        orderBy: { _count: { browser: "desc" } },
        take: 10
      }),
      prisma.clickEvent.groupBy({
        by: ["os"],
        where,
        _count: { os: true },
        orderBy: { _count: { os: "desc" } },
        take: 10
      }),
      prisma.clickEvent.groupBy({
        by: ["device"],
        where,
        _count: { device: true },
        orderBy: { _count: { device: "desc" } },
        take: 10
      }),
      prisma.clickEvent.groupBy({
        by: ["referer"],
        where,
        _count: { referer: true },
        orderBy: { _count: { referer: "desc" } },
        take: 10
      }),
      prisma.$queryRaw<Array<{ day: Date; clicks: bigint }>>`
        SELECT date_trunc('day', "clickedAt") AS day, COUNT(*)::bigint AS clicks
        FROM "ClickEvent"
        WHERE "linkId" = ${link.id}
          AND (${from ?? null}::timestamp IS NULL OR "clickedAt" >= ${from ?? null}::timestamp)
          AND (${to ?? null}::timestamp IS NULL OR "clickedAt" <= ${to ?? null}::timestamp)
        GROUP BY day
        ORDER BY day ASC
      `
    ]);

  return {
    link: {
      id: link.id,
      code: link.code,
      shortUrl: shortUrlFor(link.code),
      targetUrl: link.targetUrl,
      title: link.title,
      description: link.description,
      tags: link.tags,
      status: link.status,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt
    },
    totalClicks,
    recentClicks,
    breakdowns: {
      browser: byBrowser.map((item) => ({
        name: item.browser || "Unknown",
        clicks: item._count.browser
      })),
      os: byOs.map((item) => ({
        name: item.os || "Unknown",
        clicks: item._count.os
      })),
      device: byDevice.map((item) => ({
        name: item.device || "Unknown",
        clicks: item._count.device
      })),
      referer: byReferer.map((item) => ({
        name: item.referer || "Direct",
        clicks: item._count.referer
      }))
    },
    dailyClicks: byDay.map((item) => ({
      day: item.day.toISOString(),
      clicks: Number(item.clicks)
    }))
  };
}
