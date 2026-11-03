import Link from "next/link";

import { cn } from "@/lib/utils";
import { METRIC_WINDOWS, WINDOW_SHORT_LABELS } from "@/lib/metrics/windows";

interface WindowTabsProps {
  windowKey: string;
  /** Product filter carried across window changes. */
  productId?: string;
  className?: string;
}

export function WindowTabs({ windowKey, productId, className }: WindowTabsProps) {
  return (
    <div
      role="group"
      aria-label="Time window"
      className={cn(
        "flex rounded-[10px] bg-lavender-100 p-1",
        className
      )}
    >
      {METRIC_WINDOWS.map((key) => {
        const active = key === windowKey;
        return (
          <Link
            key={key}
            href={`?window=${key}${
              productId ? `&product=${encodeURIComponent(productId)}` : ""
            }`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-sm font-semibold transition-all duration-[var(--duration-fast)]",
              active
                ? "bg-white text-terracotta-600 shadow-sm"
                : "text-neutral-500 hover:bg-white/60 hover:text-neutral-950"
            )}
          >
            {WINDOW_SHORT_LABELS[key]}
          </Link>
        );
      })}
    </div>
  );
}
