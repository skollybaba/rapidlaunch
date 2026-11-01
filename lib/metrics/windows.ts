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
