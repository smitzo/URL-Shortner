"use client";

import Link from "next/link";
import { TrashIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, readableUrl } from "@/lib/format";
import type { CreatedLink } from "@/types/api";

type RecentLinksPanelProps = {
  links: CreatedLink[];
  onClear: () => void;
};

export function RecentLinksPanel({ links, onClear }: RecentLinksPanelProps) {
  return (
    <Panel
      title="Recent links"
      description="Stored only in this browser."
      action={
        links.length > 0 ? (
          <Button variant="ghost" icon={<TrashIcon className="h-4 w-4" />} onClick={onClear}>
            Clear
          </Button>
        ) : null
      }
    >
      {links.length === 0 ? (
        <p className="text-sm text-slate-500">Created links will appear here for quick access.</p>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/analytics/${link.code}?adminKey=${encodeURIComponent(link.adminKey)}`}
                  className="break-all text-sm font-semibold text-ink-950 hover:text-signal-500"
                >
                  {link.shortUrl}
                </Link>
                <StatusBadge status={link.status} />
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">{readableUrl(link.targetUrl)}</p>
              <p className="mt-2 text-xs text-slate-400">Created {formatDateTime(link.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
