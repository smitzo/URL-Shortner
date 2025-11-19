"use client";

import { Panel } from "@/components/ui/panel";
import { formatNumber } from "@/lib/format";
import type { AnalyticsBreakdownItem, LinkAnalytics } from "@/types/api";

type BreakdownGridProps = {
  analytics: LinkAnalytics | null;
};

export function BreakdownGrid({ analytics }: BreakdownGridProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <BreakdownPanel title="Browsers" items={analytics?.breakdowns.browser ?? []} />
      <BreakdownPanel title="Operating systems" items={analytics?.breakdowns.os ?? []} />
      <BreakdownPanel title="Devices" items={analytics?.breakdowns.device ?? []} />
      <BreakdownPanel title="Referrers" items={analytics?.breakdowns.referer ?? []} />
    </div>
  );
}

function BreakdownPanel({ title, items }: { title: string; items: AnalyticsBreakdownItem[] }) {
  const total = Math.max(
    1,
    items.reduce((sum, item) => sum + item.clicks, 0)
  );

  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const cells = Math.max(1, Math.round((item.clicks / total) * 12));

            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-ink-950">{item.name}</span>
                  <span className="text-slate-500">{formatNumber(item.clicks)}</span>
                </div>
                <div className="grid grid-cols-12 gap-0.5">
                  {Array.from({ length: 12 }, (_, index) => (
                    <span
                      key={index}
                      className={
                        index < cells
                          ? "h-2 rounded-sm bg-ink-950"
                          : "h-2 rounded-sm bg-slate-100"
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
