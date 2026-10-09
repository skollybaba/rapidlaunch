import Link from "next/link";

import { cn } from "@/lib/utils";
import { METRIC_WINDOWS, WINDOW_SHORT_LABELS } from "@/lib/metrics/windows";

interface WindowTabsProps {
  windowKey: string;
  className?: string;
}

export function WindowTabs({ windowKey, className }: WindowTabsProps) {
  return (
    <div
      role="group"
      aria-label="Time window"
      className={cn(
        "flex rounded-pill border border-neutral-300 bg-white p-1",
        className
      )}
    >
      {METRIC_WINDOWS.map((key) => {
        const active = key === windowKey;
        return (
          <Link
            key={key}
            href={`?window=${key}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-pill px-3.5 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
              active
                ? "bg-ink-900 text-white"
                : "text-neutral-500 hover:text-neutral-950"
            )}
          >
            {WINDOW_SHORT_LABELS[key]}
          </Link>
        );
      })}
    </div>
  );
}
