export const METRIC_WINDOWS = ["7d", "30d", "90d", "12m"] as const;

export type MetricWindowKey = (typeof METRIC_WINDOWS)[number];

/** Selected when the admin picks an explicit start and end date. */
export const CUSTOM_WINDOW_KEY = "custom" as const;

export type MetricWindowSelection = MetricWindowKey | typeof CUSTOM_WINDOW_KEY;

export const WINDOW_LABELS: Record<MetricWindowKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};

export const WINDOW_SHORT_LABELS: Record<MetricWindowKey, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "12m": "12 months",
};

export const CUSTOM_WINDOW_LABEL = "Custom range";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `value` is a real calendar date in `YYYY-MM-DD` form. Dates are
 * interpreted as UTC calendar days so a range means the same thing on the
 * server regardless of the viewer's timezone.
 */
export function isIsoDate(value?: string | null): value is string {
  if (!value || !ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Formats a Date as a UTC `YYYY-MM-DD` key. */
export function isoDateOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/** Widest custom range we accept, so one query cannot scan years of history. */
export const MAX_CUSTOM_RANGE_DAYS = 1_826;

export interface CustomDateRange {
  /** UTC midnight of the first day in range (inclusive). */
  start: Date;
  /** UTC midnight after the last day in range (exclusive). */
  end: Date;
  /** `YYYY-MM-DD` of the first day. */
  startDate: string;
  /** `YYYY-MM-DD` of the last, inclusive day. */
  endDate: string;
  /** Number of full days in the range. */
  days: number;
}

export function utcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Resolves a custom start/end pair into concrete UTC day bounds. The end date
 * is inclusive, so the exclusive bound is the following day. Returns null when
 * the input is missing, not a real date, backwards, empty, or wider than the
 * allowed span — callers then fall back to their default window.
 */
export function resolveCustomDateRange(
  startInput?: string,
  endInput?: string,
  now: Date = new Date()
): CustomDateRange | null {
  if (!isIsoDate(startInput) || !isIsoDate(endInput)) return null;

  const start = new Date(`${startInput}T00:00:00.000Z`);
  const end = addUtcDays(new Date(`${endInput}T00:00:00.000Z`), 1);
  if (end <= start) return null;

  // Never report future data: clamp an end date beyond today to end of today.
  const todayEnd = addUtcDays(utcDayStart(now), 1);
  const clampedEnd = end > todayEnd ? todayEnd : end;
  if (clampedEnd <= start) return null;

  const days = Math.round((clampedEnd.getTime() - start.getTime()) / DAY_MS);
  if (days < 1 || days > MAX_CUSTOM_RANGE_DAYS) return null;

  return {
    start,
    end: clampedEnd,
    startDate: isoDateOf(start),
    endDate: isoDateOf(addUtcDays(clampedEnd, -1)),
    days,
  };
}

/** "Jan 1, 2026" in UTC. */
export function formatUtcDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Jan 1, 2026 – Mar 31, 2026" for a resolved custom range. */
export function formatRangeLabel(range: CustomDateRange): string {
  return `${formatUtcDay(range.start)} – ${formatUtcDay(
    addUtcDays(range.end, -1)
  )}`;
}
