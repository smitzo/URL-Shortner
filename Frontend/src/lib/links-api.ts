import { apiRequest } from "@/lib/api-client";
import { cachedRequest, clearCachePrefix } from "@/lib/request-cache";
import { config } from "@/lib/config";
import type {
  AdminSummary,
  AnalyticsQuery,
  AuditEvent,
  CreatedLink,
  CreateLinkPayload,
  LinkAnalytics,
  LinkStatus,
  PublicLink
} from "@/types/api";

const analyticsCacheKey = (code: string, query: AnalyticsQuery) =>
  `analytics:${code}:${query.adminKey}:${query.from ?? ""}:${query.to ?? ""}:${query.limit ?? 25}`;

export function createShortLink(payload: CreateLinkPayload) {
  return apiRequest<CreatedLink>("/api/links", {
    method: "POST",
    body: payload
  });
}

export function getPublicLink(code: string) {
  return cachedRequest(`link:${code}`, 30_000, () =>
    apiRequest<PublicLink>(`/api/links/${encodeURIComponent(code)}`)
  );
}

export function getAdminSummary(code: string, adminKey: string) {
  return cachedRequest(`summary:${code}:${adminKey}`, 10_000, () =>
    apiRequest<AdminSummary>(`/api/links/${encodeURIComponent(code)}/admin`, {
      headers: { "X-Admin-Key": adminKey }
    })
  );
}

export function getAnalytics(code: string, query: AnalyticsQuery) {
  return cachedRequest(analyticsCacheKey(code, query), 15_000, () => {
    const params = new URLSearchParams();
    params.set("limit", String(query.limit ?? 25));

    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);

    return apiRequest<LinkAnalytics>(
      `/api/links/${encodeURIComponent(code)}/analytics?${params.toString()}`,
      {
        headers: { "X-Admin-Key": query.adminKey }
      }
    );
  });
}

export function getAuditEvents(code: string, adminKey: string) {
  return cachedRequest(`audit:${code}:${adminKey}`, 15_000, () =>
    apiRequest<AuditEvent[]>(`/api/links/${encodeURIComponent(code)}/audit`, {
      headers: { "X-Admin-Key": adminKey }
    })
  );
}

export async function updateLinkMetadata(
  code: string,
  adminKey: string,
  payload: Partial<Pick<PublicLink, "title" | "description" | "tags" | "expiresAt">>
) {
  const link = await apiRequest<PublicLink>(`/api/links/${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: { "X-Admin-Key": adminKey },
    body: payload
  });

  clearCachePrefix(`link:${code}`);
  clearCachePrefix(`summary:${code}`);
  clearCachePrefix(`analytics:${code}`);
  clearCachePrefix(`audit:${code}`);
  return link;
}

export async function updateLinkStatus(
  code: string,
  adminKey: string,
  status: Extract<LinkStatus, "ACTIVE" | "DISABLED">
) {
  const link = await apiRequest<PublicLink>(`/api/links/${encodeURIComponent(code)}/status`, {
    method: "PATCH",
    headers: { "X-Admin-Key": adminKey },
    body: { status }
  });

  clearCachePrefix(`link:${code}`);
  clearCachePrefix(`summary:${code}`);
  clearCachePrefix(`analytics:${code}`);
  clearCachePrefix(`audit:${code}`);
  return link;
}

export function analyticsCsvUrl(code: string, adminKey: string) {
  const params = new URLSearchParams({ adminKey, limit: "1000" });
  return `${config.apiBaseUrl}/api/links/${encodeURIComponent(
    code
  )}/analytics/export.csv?${params.toString()}`;
}
