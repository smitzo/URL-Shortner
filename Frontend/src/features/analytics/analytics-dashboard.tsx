"use client";

import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui/panel";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useAdminKey } from "@/hooks/use-admin-key";
import { AnalyticsSummary } from "@/features/analytics/analytics-summary";
import { AuditTimeline } from "@/features/analytics/audit-timeline";
import { BreakdownGrid } from "@/features/analytics/breakdown-grid";
import { ExportActions } from "@/features/analytics/export-actions";
import { LinkOverview } from "@/features/analytics/link-overview";
import { MetadataEditor } from "@/features/analytics/metadata-editor";
import { RecentClicksTable } from "@/features/analytics/recent-clicks-table";
import { StatusControls } from "@/features/analytics/status-controls";
import { getAnalytics, getAdminSummary } from "@/lib/links-api";
import { useAsyncResource } from "@/hooks/use-async-resource";
import type { PublicLink } from "@/types/api";
import { useState } from "react";

export function AnalyticsDashboard({ code }: { code: string }) {
  const { adminKey, setAdminKey, hasAdminKey } = useAdminKey(code);
  const [editedLink, setEditedLink] = useState<PublicLink | null>(null);
  const analytics = useAsyncResource(
    hasAdminKey,
    () => getAnalytics(code, { adminKey, limit: 25 }),
    [code, adminKey]
  );
  const summary = useAsyncResource(
    hasAdminKey,
    () => getAdminSummary(code, adminKey),
    [code, adminKey]
  );
  const activeLink = editedLink ?? summary.data?.link ?? analytics.data?.link ?? null;

  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-signal-500">
          Analytics
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-ink-950 sm:text-4xl">
          Manage `{code}`
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-600">
          Review click behavior, update operational metadata, and keep link state under control.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <LinkOverview code={code} adminKey={adminKey} enabled={hasAdminKey} />
          <AnalyticsSummary code={code} adminKey={adminKey} enabled={hasAdminKey} />
          <BreakdownGrid analytics={analytics.data} />
          <RecentClicksTable clicks={analytics.data?.recentClicks ?? []} />
        </div>
        <div className="space-y-6">
          <Panel title="Admin key" description="Required for protected analytics and management actions.">
            <div className="space-y-4">
              <Field
                id="adminKey"
                label="Admin key"
                value={adminKey}
                placeholder="Paste admin key"
                onChange={(event) => setAdminKey(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setAdminKey("")}>
                  Clear saved key
                </Button>
                <ExportActions code={code} adminKey={adminKey} enabled={hasAdminKey} />
              </div>
            </div>
          </Panel>
          <MetadataEditor
            link={activeLink}
            adminKey={adminKey}
            enabled={hasAdminKey}
            onUpdated={setEditedLink}
          />
          <StatusControls
            link={activeLink}
            adminKey={adminKey}
            enabled={hasAdminKey}
            onUpdated={setEditedLink}
          />
          <AuditTimeline code={code} adminKey={adminKey} enabled={hasAdminKey} />
        </div>
      </div>
    </AppShell>
  );
}
