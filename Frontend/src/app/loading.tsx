import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui/panel";

export default function RootLoading() {
  return (
    <AppShell>
      <div className="mb-8 max-w-3xl space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <Panel>
          <div className="h-96 animate-pulse rounded-md bg-slate-100" />
        </Panel>
        <Panel>
          <div className="h-72 animate-pulse rounded-md bg-slate-100" />
        </Panel>
      </div>
    </AppShell>
  );
}
