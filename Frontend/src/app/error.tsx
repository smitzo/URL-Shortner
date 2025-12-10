"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function RootError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <Panel title="Something went wrong" description="The frontend hit an unexpected state.">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Try again. If the issue continues, keep the current URL and check the browser console or
            backend logs.
          </p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </Panel>
    </AppShell>
  );
}
