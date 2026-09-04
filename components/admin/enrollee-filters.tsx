"use client";

import { usePathname, useRouter } from "next/navigation";

export interface EnrolleeCourseOption {
  value: string;
  label: string;
  count: number;
}

const selectClasses =
  "mt-1 rounded-[12px] border border-neutral-300 bg-white px-4 py-2.5 pr-8 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

export function EnrolleeFilters({
  options,
  current,
}: {
  options: EnrolleeCourseOption[];
  current: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function select(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("course", value);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label
          htmlFor="enrollee-course"
          className="block text-xs font-semibold text-neutral-500"
        >
          Course
        </label>
        <select
          id="enrollee-course"
          value={current}
          onChange={(e) => select(e.target.value)}
          className={selectClasses}
        >
          <option value="">All courses</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </div>

      {current ? (
        <button
          type="button"
          onClick={() => select("")}
          className="h-[42px] rounded-pill border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-600 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100"
        >
          Clear course filter
        </button>
      ) : null}
    </div>
  );
}