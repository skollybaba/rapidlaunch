import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type StatTone = "default" | "success" | "warning" | "danger" | "info" | "ai";

const toneClasses: Record<StatTone, string> = {
  default: "bg-terracotta-100 text-terracotta-600",
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
  danger: "bg-danger-100 text-danger-600",
  info: "bg-lavender-100 text-ink-700",
  ai: "bg-ai-violet-soft text-ai-violet",
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  deltaPct?: number | null;
  deltaLabel?: string;
  tone?: StatTone;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  deltaPct,
  deltaLabel,
  tone = "default",
}: StatCardProps) {
  const hasDelta = typeof deltaPct === "number";
  const positive = hasDelta && (deltaPct as number) >= 0;

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5 transition-shadow duration-[var(--duration-standard)] hover:shadow-[0_8px_24px_rgb(17_18_29_/_6%)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
          {label}
        </p>
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            toneClasses[tone]
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold tabular-nums text-neutral-950">
        {value}
      </p>

      {hasDelta ? (
        <p
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 text-sm font-semibold",
            positive ? "text-success-600" : "text-danger-600"
          )}
        >
          {positive ? (
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          ) : (
            <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
          )}
          {Math.abs(deltaPct as number)}%
          {deltaLabel ? (
            <span className="font-normal text-neutral-500">{deltaLabel}</span>
          ) : null}
        </p>
      ) : (
        <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-neutral-500">
          {deltaPct === null ? (
            <Minus aria-hidden="true" className="h-4 w-4" />
          ) : null}
          {hint ?? (deltaPct === null ? "No prior data" : "")}
        </p>
      )}
    </div>
  );
}
