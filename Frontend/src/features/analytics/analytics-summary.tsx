"use client";

import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { formatNumber, formatShortDate } from "@/lib/format";
import { getAnalytics } from "@/lib/links-api";
import { useAsyncResource } from "@/hooks/use-async-resource";

type AnalyticsSummaryProps = {
  code: string;
  adminKey: string;
  enabled: boolean;
};

export function AnalyticsSummary({ code, adminKey, enabled }: AnalyticsSummaryProps) {
  const analytics = useAsyncResource(
    enabled,
    () => getAnalytics(code, { adminKey, limit: 25 }),
    [code, adminKey]
  );
  const maxDailyClicks = Math.max(...(analytics.data?.dailyClicks.map((item) => item.clicks) ?? [1]));

  return (
    <Panel
      title="Click analytics"
      description="Cached briefly and safe to refresh on demand."
      action={
        <Button
          variant="ghost"
          loading={analytics.refreshing}
          icon={<ArrowPathIcon className="h-4 w-4" />}
          onClick={() => void analytics.refresh()}
          disabled={!enabled}
        >
          Refresh
        </Button>
      }
    >
      {!enabled ? (
        <p className="text-sm text-slate-500">Enter an admin key to load analytics.</p>
      ) : analytics.loading ? (
        <div className="h-56 animate-pulse rounded-md bg-slate-100" />
      ) : analytics.error ? (
        <p className="text-sm font-medium text-red-600">{analytics.error}</p>
      ) : analytics.data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Total clicks" value={formatNumber(analytics.data.totalClicks)} />
            <Metric label="Recent events" value={formatNumber(analytics.data.recentClicks.length)} />
            <Metric label="Tracked days" value={formatNumber(analytics.data.dailyClicks.length)} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-950">Daily clicks</h3>
            {analytics.data.dailyClicks.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No click events recorded yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {analytics.data.dailyClicks.map((item) => (
                  <div key={item.day} className="grid grid-cols-[72px_1fr_48px] items-center gap-3">
                    <span className="text-xs text-slate-500">{formatShortDate(item.day)}</span>
                    <div className="grid grid-cols-20 gap-0.5">
                      {Array.from({ length: 20 }, (_, index) => {
                        const filledSegments = Math.max(
                          1,
                          Math.ceil((item.clicks / maxDailyClicks) * 20)
                        );

                        return (
                          <span
                            key={index}
                            className={
                              index < filledSegments
                                ? "h-3 rounded-sm bg-signal-500"
                                : "h-3 rounded-sm bg-slate-100"
                            }
                          />
                        );
                      })}
                    </div>
                    <span className="text-right text-xs font-semibold text-ink-950">
                      {formatNumber(item.clicks)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink-950">{value}</p>
    </div>
  );
}
