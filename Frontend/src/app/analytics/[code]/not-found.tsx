import { AppShell } from "@/components/app-shell";
import { LinkButton } from "@/components/ui/link-button";
import { Panel } from "@/components/ui/panel";

export default function AnalyticsNotFound() {
  return (
    <AppShell>
      <Panel title="Analytics page unavailable" description="The requested analytics page could not be opened.">
        <LinkButton href="/">Back to links</LinkButton>
      </Panel>
    </AppShell>
  );
}
