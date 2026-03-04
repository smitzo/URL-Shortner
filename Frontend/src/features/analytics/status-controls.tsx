"use client";

import { PauseIcon, PlayIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { updateLinkStatus } from "@/lib/links-api";
import type { PublicLink } from "@/types/api";
import { useState } from "react";

type StatusControlsProps = {
  link: PublicLink | null;
  adminKey: string;
  enabled: boolean;
  onUpdated: (link: PublicLink) => void;
};

export function StatusControls({ link, adminKey, enabled, onUpdated }: StatusControlsProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canDisable = link?.status === "ACTIVE";
  const nextStatus = canDisable ? "DISABLED" : "ACTIVE";

  async function handleUpdate() {
    if (!link) return;

    setSaving(true);
    setMessage(null);

    try {
      const updated = await updateLinkStatus(link.code, adminKey, nextStatus);
      onUpdated(updated);
      setMessage(canDisable ? "Link disabled." : "Link reactivated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update link status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Status controls" description="Pause or resume redirects without deleting analytics.">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {link?.status === "DISABLED"
            ? "This short link is disabled and will not redirect."
            : "Disable the link when a campaign ends or a destination should stop receiving traffic."}
        </p>
        {message ? <p className="text-sm font-medium text-slate-600">{message}</p> : null}
        <Button
          variant={canDisable ? "danger" : "primary"}
          loading={saving}
          disabled={!enabled || !link || link.status === "EXPIRED"}
          icon={canDisable ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          onClick={() => void handleUpdate()}
        >
          {canDisable ? "Disable link" : "Reactivate link"}
        </Button>
      </div>
    </Panel>
  );
}
