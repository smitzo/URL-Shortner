"use client";

import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/button";
import { analyticsCsvUrl } from "@/lib/links-api";

type ExportActionsProps = {
  code: string;
  adminKey: string;
  enabled: boolean;
};

export function ExportActions({ code, adminKey, enabled }: ExportActionsProps) {
  const href = enabled ? analyticsCsvUrl(code, adminKey) : "#";

  return (
    <a href={href} aria-disabled={!enabled} className={!enabled ? "pointer-events-none" : undefined}>
      <Button
        variant="secondary"
        disabled={!enabled}
        icon={<ArrowDownTrayIcon className="h-4 w-4" />}
      >
        Export CSV
      </Button>
    </a>
  );
}
