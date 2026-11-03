import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

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

      {/* One toolbar card holds every scope control so the active window,
          product and date range read as a single filter row. */}
      {windowKey || children ? (
        <div className="mt-2 rounded-[16px] border border-neutral-300 bg-white p-3 shadow-[0_2px_8px_rgb(17_18_29_/_4%)] sm:p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5 pr-1 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
              <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
              Scope
            </span>

            {windowKey ? (
              <>
                <ProductFilter productId={productId} options={productOptions} />
                <span
                  aria-hidden="true"
                  className="hidden h-6 w-px bg-neutral-100 sm:block"
                />
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
        </div>
      ) : null}
    </header>
  );
}
