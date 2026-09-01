import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "success"
  | "info"
  | "pending"
  | "error";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-neutral-300 bg-neutral-100 text-neutral-700",
  success: "border-success-100 bg-success-100 text-success-600",
  info: "border-lavender-200 bg-lavender-100 text-ink-700",
  pending: "border-warning-100 bg-warning-100 text-warning-600",
  error: "border-danger-100 bg-danger-100 text-danger-600",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}