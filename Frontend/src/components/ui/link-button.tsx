import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type LinkButtonVariant = "primary" | "secondary";

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: LinkButtonVariant;
  icon?: ReactNode;
};

const variants: Record<LinkButtonVariant, string> = {
  primary: "bg-ink-950 text-white hover:bg-ink-900 focus-visible:outline-ink-950",
  secondary:
    "border border-slate-300 bg-white text-ink-950 hover:bg-slate-100 focus-visible:outline-slate-500"
};

export function LinkButton({
  className,
  children,
  variant = "primary",
  icon,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
