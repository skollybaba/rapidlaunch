"use client";

import { usePathname, useRouter } from "next/navigation";

import type { BookingRange } from "@/types/booking";
import { BOOKING_STATUSES } from "@/types/booking";

const RANGE_OPTIONS: { value: "" | BookingRange; label: string }[] = [
  { value: "", label: "All time" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "next7", label: "Next 7 days" },
  { value: "next30", label: "Next 30 days" },
  { value: "next365", label: "Next 12 months" },
];

const selectClasses =
  "mt-1 rounded-[12px] border border-neutral-300 bg-white px-4 py-2.5 pr-8 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

export function BookingFilters({
  status,
  range,
}: {
  status: string;
  range: BookingRange | undefined;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function apply(nextStatus: string, nextRange: string) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (nextRange) params.set("range", nextRange);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  const hasFilters = Boolean(status) || Boolean(range);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label
          htmlFor="bk-range"
          className="block text-xs font-semibold text-neutral-500"
        >
          Time range
        </label>
        <select
          id="bk-range"
          value={range ?? ""}
          onChange={(e) => apply(status, e.target.value)}
          className={selectClasses}
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="bk-status"
          className="block text-xs font-semibold text-neutral-500"
        >
          Status
        </label>
        <select
          id="bk-status"
          value={status}
          onChange={(e) => apply(e.target.value, range ?? "")}
          className={selectClasses}
        >
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => apply("", "")}
          className="h-[42px] rounded-pill border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-600 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}