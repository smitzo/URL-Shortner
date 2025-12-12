import { AppShell } from "@/components/app-shell";
import { LinkButton } from "@/components/ui/link-button";
import { Panel } from "@/components/ui/panel";

export default function NotFoundPage() {
  return (
    <AppShell>
      <Panel title="Page not found" description="That route does not exist in Shortner.">
        <LinkButton href="/">Back to dashboard</LinkButton>
      </Panel>
    </AppShell>
  );
}
