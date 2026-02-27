"use client";

import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatNumber, readableUrl } from "@/lib/format";
import { getAdminSummary } from "@/lib/links-api";
import { useAsyncResource } from "@/hooks/use-async-resource";

type LinkOverviewProps = {
  code: string;
  adminKey: string;
  enabled: boolean;
};

export function LinkOverview({ code, adminKey, enabled }: LinkOverviewProps) {
  const summary = useAsyncResource(
    enabled,
    () => getAdminSummary(code, adminKey),
    [code, adminKey]
  );

  return (
    <Panel
      title="Link overview"
      description="Owner-only summary for this short link."
      action={
        <Button
          variant="ghost"
          loading={summary.refreshing}
          icon={<ArrowPathIcon className="h-4 w-4" />}
          onClick={() => void summary.refresh()}
          disabled={!enabled}
        >
          Refresh
        </Button>
      }
    >
      {!enabled ? (
        <p className="text-sm text-slate-500">Enter an admin key to load the overview.</p>
      ) : summary.loading ? (
        <div className="h-28 animate-pulse rounded-md bg-slate-100" />
      ) : summary.error ? (
        <p className="text-sm font-medium text-red-600">{summary.error}</p>
      ) : summary.data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={summary.data.link.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-lg font-semibold text-signal-500 hover:text-signal-600"
              >
                {summary.data.link.shortUrl}
              </a>
              <StatusBadge status={summary.data.link.status} />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Destination: {readableUrl(summary.data.link.targetUrl)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Last click: {formatDateTime(summary.data.lastClickedAt)}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total clicks
            </p>
            <p className="mt-2 text-3xl font-semibold text-ink-950">
              {formatNumber(summary.data.totalClicks)}
            </p>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
