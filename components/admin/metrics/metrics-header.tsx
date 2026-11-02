import type { ReactNode } from "react";

import { CustomRangeForm } from "@/components/admin/metrics/custom-range-form";
import { ProductFilter } from "@/components/admin/metrics/product-filter";
import { WindowTabs } from "@/components/admin/metrics/window-tabs";
import { getMetricProductOptions } from "@/lib/metrics/product-options";
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
  /** Product the page is narrowed to, if any. */
  productId?: string;
  children?: ReactNode;
}

export async function MetricsHeader({
  title,
  subtitle,
  eyebrow = "Analytics",
  windowKey,
  windowLabel,
  rangeStart,
  rangeEnd,
  productId,
  children,
}: MetricsHeaderProps) {
  // Only pages with filters need the picker, so skip the query otherwise.
  const productOptions = windowKey ? await getMetricProductOptions() : [];

  return (
    <header className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-[32px] leading-[1.286] md:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>

      {/* One filter row: product, window presets and the custom range sit
          together so the active scope reads left to right. */}
      {windowKey || children ? (
        <div className="flex w-full flex-wrap items-end gap-3">
          {windowKey ? (
            <>
              <ProductFilter productId={productId} options={productOptions} />
              <WindowTabs windowKey={windowKey} productId={productId} />
              <CustomRangeForm
                key={`${windowKey}-${rangeStart ?? ""}-${rangeEnd ?? ""}`}
                start={rangeStart}
                end={rangeEnd}
                label={windowLabel}
                active={windowKey === CUSTOM_WINDOW_KEY}
              />
            </>
          ) : null}
          {children}
        </div>
      ) : null}
    </header>
  );
}
