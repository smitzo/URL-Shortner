import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function AnalyticsNotFound() {
  return (
    <AppShell>
      <Panel title="Analytics page unavailable" description="The requested analytics page could not be opened.">
        <Link href="/">
          <Button>Back to links</Button>
        </Link>
      </Panel>
    </AppShell>
  );
}
