import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink-950 text-white hover:bg-ink-900 focus-visible:outline-ink-950 disabled:bg-slate-300",
  secondary:
    "border border-slate-300 bg-white text-ink-950 hover:bg-slate-100 focus-visible:outline-slate-500 disabled:text-slate-400",
  ghost:
    "text-ink-700 hover:bg-slate-100 focus-visible:outline-slate-500 disabled:text-slate-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-300"
};

export function Button({
  className,
  children,
  variant = "primary",
  loading = false,
  icon,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
}
