"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui/panel";
import { CreatedLinkCard } from "@/features/links/created-link-card";
import { CreateLinkForm } from "@/features/links/create-link-form";
import { RecentLinksPanel } from "@/features/links/recent-links-panel";
import { useRecentLinks } from "@/hooks/use-recent-links";
import type { CreatedLink } from "@/types/api";

export function LinkDashboard() {
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);
  const recent = useRecentLinks();

  function handleCreated(link: CreatedLink) {
    setCreatedLink(link);
    recent.addLink(link);
  }

  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-signal-500">
          URL operations
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-ink-950 sm:text-4xl">
          Create short links and keep analytics close.
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-600">
          Generate managed short links, protect analytics with admin keys, and inspect recent
          activity without leaving the workflow.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <Panel title="Create a short link" description="Destination validation also runs on the backend.">
            <CreateLinkForm onCreated={handleCreated} />
          </Panel>
          {createdLink ? <CreatedLinkCard link={createdLink} /> : null}
        </div>
        <RecentLinksPanel links={recent.links} onClear={recent.clearLinks} />
      </div>
    </AppShell>
  );
}
