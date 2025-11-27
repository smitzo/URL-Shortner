"use client";

import { ClockIcon } from "@heroicons/react/20/solid";
import { Panel } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/format";
import { getAuditEvents } from "@/lib/links-api";
import { useAsyncResource } from "@/hooks/use-async-resource";

type AuditTimelineProps = {
  code: string;
  adminKey: string;
  enabled: boolean;
};

export function AuditTimeline({ code, adminKey, enabled }: AuditTimelineProps) {
  const audit = useAsyncResource(enabled, () => getAuditEvents(code, adminKey), [code, adminKey]);

  return (
    <Panel title="Audit trail" description="Recent owner actions for this link.">
      {!enabled ? (
        <p className="text-sm text-slate-500">Enter an admin key to load audit events.</p>
      ) : audit.loading ? (
        <div className="h-32 animate-pulse rounded-md bg-slate-100" />
      ) : audit.error ? (
        <p className="text-sm font-medium text-red-600">{audit.error}</p>
      ) : audit.data?.length ? (
        <ol className="space-y-4">
          {audit.data.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <ClockIcon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-950">{humanizeAction(event.action)}</p>
                <p className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-slate-500">No audit events recorded yet.</p>
      )}
    </Panel>
  );
}

function humanizeAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
