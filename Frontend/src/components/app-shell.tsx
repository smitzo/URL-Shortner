import type { ReactNode } from "react";
import Link from "next/link";
import { ChartBarSquareIcon, LinkIcon } from "@heroicons/react/24/outline";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-950 text-white">
              <LinkIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink-950">Shortner</span>
              <span className="block text-xs text-slate-500">Links and analytics</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-100 hover:text-ink-950"
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
              Links
            </Link>
            <span className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-slate-400">
              <ChartBarSquareIcon className="h-4 w-4" aria-hidden="true" />
              Analytics
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
