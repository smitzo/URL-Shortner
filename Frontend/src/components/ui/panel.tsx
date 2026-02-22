import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PanelProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, description, action, children, className }: PanelProps) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-5 shadow-soft", className)}>
      {(title || description || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-base font-semibold text-ink-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
