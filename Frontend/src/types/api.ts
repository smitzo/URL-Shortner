export type LinkStatus = "ACTIVE" | "DISABLED" | "EXPIRED";

export type ApiEnvelope<TData> = {
  data: TData;
  meta?: Record<string, unknown>;
};

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

export type PublicLink = {
  id: string;
  code: string;
  shortUrl: string;
  targetUrl: string;
  title: string | null;
  description: string | null;
  tags: string[];
  status: LinkStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLinkPayload = {
  targetUrl: string;
  customCode?: string;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: string;
};

export type CreatedLink = PublicLink & {
  adminKey: string;
  analyticsUrl: string;
};

export type AnalyticsQuery = {
  adminKey: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type AnalyticsBreakdownItem = {
  name: string;
  clicks: number;
};

export type RecentClick = {
  id: string;
  clickedAt: string;
  referer: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
};

export type LinkAnalytics = {
  link: PublicLink;
  totalClicks: number;
  recentClicks: RecentClick[];
  breakdowns: {
    browser: AnalyticsBreakdownItem[];
    os: AnalyticsBreakdownItem[];
    device: AnalyticsBreakdownItem[];
    referer: AnalyticsBreakdownItem[];
  };
  dailyClicks: Array<{
    day: string;
    clicks: number;
  }>;
};

export type AdminSummary = {
  link: PublicLink;
  totalClicks: number;
  lastClickedAt: string | null;
};

export type AuditEvent = {
  id: string;
  action: string;
  changes: Record<string, unknown>;
  createdAt: string;
};

export type HealthStatus = {
  status: "ok";
  service: string;
};
