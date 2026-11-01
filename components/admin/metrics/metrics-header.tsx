import type { ReactNode } from "react";

import { CustomRangeForm } from "@/components/admin/metrics/custom-range-form";
import { WindowTabs } from "@/components/admin/metrics/window-tabs";
import { CUSTOM_WINDOW_KEY } from "@/lib/metrics/windows";

interface MetricsHeaderProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  windowKey?: string;
  /** Human-readable label for the active window (e.g. "Jan 1, 2026 – Mar 31, 2026"). */
  windowLabel?: string;
  /** `YYYY-MM-DD` start of the active custom range, if one is selected. */
  rangeStart?: string;
  /** `YYYY-MM-DD` inclusive end of the active custom range. */
  rangeEnd?: string;
  children?: ReactNode;
}

export function MetricsHeader({
  title,
  subtitle,
  eyebrow = "Analytics",
  windowKey,
  windowLabel,
  rangeStart,
  rangeEnd,
  children,
}: MetricsHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-[32px] leading-[1.286] md:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
        {children}
        {windowKey ? (
          <>
            <WindowTabs windowKey={windowKey} />
            <CustomRangeForm
              key={`${windowKey}-${rangeStart ?? ""}-${rangeEnd ?? ""}`}
              start={rangeStart}
              end={rangeEnd}
              label={windowLabel}
              active={windowKey === CUSTOM_WINDOW_KEY}
            />
          </>
        ) : null}
      </div>
    </header>
  );
}
