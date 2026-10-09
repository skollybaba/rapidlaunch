export const METRIC_WINDOWS = ["7d", "30d", "90d", "12m"] as const;

export type MetricWindowKey = (typeof METRIC_WINDOWS)[number];

export const WINDOW_LABELS: Record<MetricWindowKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};
