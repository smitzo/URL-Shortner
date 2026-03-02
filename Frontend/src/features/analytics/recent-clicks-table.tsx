"use client";

import { Panel } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/format";
import type { RecentClick } from "@/types/api";

export function RecentClicksTable({ clicks }: { clicks: RecentClick[] }) {
  return (
    <Panel title="Recent clicks" description="Latest click events captured for this link.">
      {clicks.length === 0 ? (
        <p className="text-sm text-slate-500">No recent clicks yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Time</th>
                <th className="px-4 py-2">Referrer</th>
                <th className="px-4 py-2">Browser</th>
                <th className="px-4 py-2">OS</th>
                <th className="py-2 pl-4">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clicks.map((click) => (
                <tr key={click.id} className="text-slate-600">
                  <td className="whitespace-nowrap py-3 pr-4 text-ink-950">
                    {formatDateTime(click.clickedAt)}
                  </td>
                  <td className="max-w-56 truncate px-4 py-3">{click.referer ?? "Direct"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{click.browser ?? "Unknown"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{click.os ?? "Unknown"}</td>
                  <td className="whitespace-nowrap py-3 pl-4">{click.device ?? "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
