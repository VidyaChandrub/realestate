import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "brand";

const variants: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  neutral:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  brand: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
};

const dots: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  neutral: "bg-slate-400",
  brand: "bg-indigo-500",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  withDot?: boolean;
}

export function statusBadgeVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (["active", "published", "paid", "live", "on track", "healthy", "connected", "completed"].includes(s)) {
    return "success";
  }
  if (["draft", "pending", "invited", "under offer", "at risk", "attention", "available"].includes(s)) {
    return "warning";
  }
  if (["disabled", "expired", "failed", "suspended", "lost", "delayed", "critical", "error"].includes(s)) {
    return "danger";
  }
  if (["sold", "leased", "closed"].includes(s)) {
    return "brand";
  }
  return "neutral";
}

export function Badge({
  variant = "default",
  withDot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    >
      {withDot ? <span className={cn("h-1.5 w-1.5 rounded-full", dots[variant])} /> : null}
      {children}
    </span>
  );
}