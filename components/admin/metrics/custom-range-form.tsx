"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, X } from "lucide-react";

import { CUSTOM_WINDOW_KEY, CUSTOM_WINDOW_LABEL } from "@/lib/metrics/windows";
import { buttonStyles } from "@/components/ui/button";

const inputClasses =
  "mt-1 h-[38px] w-[148px] rounded-[12px] border border-neutral-300 bg-white px-3 text-sm text-neutral-950 tabular-nums focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

/** Today's date in the viewer's timezone, as a `YYYY-MM-DD` value. */
function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

interface CustomRangeFormProps {
  /** `YYYY-MM-DD` start of the active custom range, if any. */
  start?: string;
  /** `YYYY-MM-DD` inclusive end of the active custom range, if any. */
  end?: string;
  /** Human-readable label for the active custom range. */
  label?: string;
  active?: boolean;
}

export function CustomRangeForm({
  start,
  end,
  label,
  active = false,
}: CustomRangeFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(start ?? "");
  const [to, setTo] = useState(end ?? "");
  const [error, setError] = useState<string | null>(null);
  const today = localIsoDate(new Date());

  /**
   * Copies the current query string so other filters (notably `product`) keep
   * applying when the date range changes or is cleared.
   */
  function buildQuery(range?: { start: string; end: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("window");
    params.delete("start");
    params.delete("end");
    if (range) {
      params.set("window", CUSTOM_WINDOW_KEY);
      params.set("start", range.start);
      params.set("end", range.end);
    }
    return params.toString();
  }

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to) {
      setError("Choose both a start and an end date.");
      return;
    }
    if (from > to) {
      setError("The start date must be on or before the end date.");
      return;
    }
    if (from > today) {
      setError("The start date cannot be in the future.");
      return;
    }
    setError(null);
    router.push(`${pathname}?${buildQuery({ start: from, end: to })}`);
  }

  function clear() {
    setError(null);
    const query = buildQuery();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <form
      onSubmit={apply}
      aria-label="Custom date range"
      className="flex w-full flex-wrap items-end gap-2 sm:w-auto sm:justify-end"
    >
      <div>
        <label
          htmlFor="metrics-range-start"
          className="block text-xs font-semibold text-neutral-500"
        >
          From
        </label>
        <input
          id="metrics-range-start"
          type="date"
          name="start"
          value={from}
          max={today}
          onChange={(event) => setFrom(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "metrics-range-error" : undefined}
          className={inputClasses}
        />
      </div>
      <div>
        <label
          htmlFor="metrics-range-end"
          className="block text-xs font-semibold text-neutral-500"
        >
          To
        </label>
        <input
          id="metrics-range-end"
          type="date"
          name="end"
          value={to}
          max={today}
          onChange={(event) => setTo(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "metrics-range-error" : undefined}
          className={inputClasses}
        />
      </div>
      <button
        type="submit"
        className={buttonStyles({ variant: "primary", size: "sm" })}
      >
        <CalendarRange aria-hidden="true" className="h-4 w-4" />
        Apply range
      </button>

      {active ? (
        <span className="flex items-center gap-2 self-end">
          <span className="inline-flex h-9 items-center rounded-pill bg-ink-900 px-3 text-xs font-semibold text-white">
            {label ?? CUSTOM_WINDOW_LABEL}
          </span>
          <button
            type="button"
            onClick={clear}
            aria-label="Clear custom date range"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 hover:text-neutral-950"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </span>
      ) : null}

      {error ? (
        <p
          id="metrics-range-error"
          role="alert"
          className="w-full text-xs font-medium text-danger-600"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
