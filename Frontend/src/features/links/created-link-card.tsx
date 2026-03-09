"use client";

import { ClipboardDocumentIcon, ChartBarIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { readableUrl } from "@/lib/format";
import type { CreatedLink } from "@/types/api";

type CreatedLinkCardProps = {
  link: CreatedLink;
};

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function CreatedLinkCard({ link }: CreatedLinkCardProps) {
  return (
    <Panel title="Created link" description="Store the admin key somewhere safe. It is shown once here.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={link.shortUrl}
            className="break-all text-lg font-semibold text-signal-500 hover:text-signal-600"
            target="_blank"
            rel="noreferrer"
          >
            {link.shortUrl}
          </a>
          <StatusBadge status={link.status} />
        </div>
        <p className="text-sm text-slate-500">Destination: {readableUrl(link.targetUrl)}</p>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Admin key</p>
          <p className="mt-1 break-all font-mono text-sm text-amber-950">{link.adminKey}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={<ClipboardDocumentIcon className="h-4 w-4" />}
            onClick={() => void copyText(link.shortUrl)}
          >
            Copy short URL
          </Button>
          <Button
            variant="secondary"
            icon={<ClipboardDocumentIcon className="h-4 w-4" />}
            onClick={() => void copyText(link.adminKey)}
          >
            Copy admin key
          </Button>
          <LinkButton
            href={`/analytics/${link.code}?adminKey=${encodeURIComponent(link.adminKey)}`}
            icon={<ChartBarIcon className="h-4 w-4" />}
          >
            Open analytics
          </LinkButton>
        </div>
      </div>
    </Panel>
  );
}
