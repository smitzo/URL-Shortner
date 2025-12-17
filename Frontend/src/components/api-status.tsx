"use client";

import { useAsyncResource } from "@/hooks/use-async-resource";
import { getHealthStatus } from "@/lib/links-api";
import { cn } from "@/lib/cn";

export function ApiStatus() {
  const health = useAsyncResource(true, getHealthStatus, []);
  const online = health.data?.status === "ok";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        online
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : health.error
            ? "bg-red-50 text-red-700 ring-red-200"
            : "bg-slate-100 text-slate-500 ring-slate-200"
      )}
      title={health.error ?? "Backend API status"}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          online ? "bg-emerald-500" : health.error ? "bg-red-500" : "bg-slate-400"
        )}
      />
      {online ? "API online" : health.error ? "API offline" : "Checking API"}
    </span>
  );
}
