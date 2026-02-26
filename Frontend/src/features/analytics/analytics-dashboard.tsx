"use client";

import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui/panel";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useAdminKey } from "@/hooks/use-admin-key";

export function AnalyticsDashboard({ code }: { code: string }) {
  const { adminKey, setAdminKey, hasAdminKey } = useAdminKey(code);

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
          <Panel title="Analytics workspace" description="Detailed panels will load after the admin key is available.">
            <p className="text-sm text-slate-500">
              {hasAdminKey
                ? "Admin key detected. Analytics modules are ready to load."
                : "Enter the admin key to unlock analytics and management controls."}
            </p>
          </Panel>
        </div>
        <Panel title="Admin key" description="Required for protected analytics and management actions.">
          <div className="space-y-4">
            <Field
              id="adminKey"
              label="Admin key"
              value={adminKey}
              placeholder="Paste admin key"
              onChange={(event) => setAdminKey(event.target.value)}
            />
            <Button variant="secondary" onClick={() => setAdminKey("")}>
              Clear saved key
            </Button>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
