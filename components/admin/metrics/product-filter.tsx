"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PRODUCT_TYPE_LABELS } from "@/lib/metrics/labels";
import type { MetricProductOption } from "@/lib/metrics/product-filter";
import { cn } from "@/lib/utils";

interface ProductFilterProps {
  /** Product currently applied, if any. */
  productId?: string;
  options: MetricProductOption[];
  className?: string;
}

/**
 * Narrows a metrics page to one product.
 *
 * The selection is written to the URL (`?product=<id>`) so it composes with the
 * window tabs and the custom date range instead of replacing them.
 */
export function ProductFilter({
  productId,
  options,
  className,
}: ProductFilterProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("product", value);
    else params.delete("product");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  // Group by type so a mixed catalogue stays scannable.
  const groups = new Map<string, MetricProductOption[]>();
  for (const option of options) {
    const list = groups.get(option.type) ?? [];
    list.push(option);
    groups.set(option.type, list);
  }

  return (
    <div className={cn("w-full sm:w-auto", className)}>
      {/* The visible context comes from the "Scope" toolbar label; this label
          keeps the select programmatically named. */}
      <label htmlFor="metrics-product" className="sr-only">
        Product
      </label>
      <select
        id="metrics-product"
        value={productId ?? ""}
        onChange={(event) => select(event.target.value)}
        className="h-9 w-full rounded-[10px] border border-neutral-300 bg-white px-3 text-sm text-neutral-950 transition-colors duration-[var(--duration-fast)] hover:border-neutral-500 focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)] sm:w-[200px]"
      >
        <option value="">All products</option>
        {[...groups.entries()].map(([type, list]) => (
          <optgroup key={type} label={PRODUCT_TYPE_LABELS[type] ?? type}>
            {list.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
