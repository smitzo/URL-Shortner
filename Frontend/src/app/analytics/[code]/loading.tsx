import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui/panel";

export default function AnalyticsLoading() {
  return (
    <AppShell>
      <div className="mb-8 h-24 max-w-3xl animate-pulse rounded-md bg-slate-100" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel>
            <div className="h-36 animate-pulse rounded-md bg-slate-100" />
          </Panel>
          <Panel>
            <div className="h-64 animate-pulse rounded-md bg-slate-100" />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel>
            <div className="h-48 animate-pulse rounded-md bg-slate-100" />
          </Panel>
          <Panel>
            <div className="h-48 animate-pulse rounded-md bg-slate-100" />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
