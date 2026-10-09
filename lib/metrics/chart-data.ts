/**
 * Server-safe builders for metrics charts. Keep these free of "use client" so
 * Server Components can call them while still passing only plain, serializable
 * data (no functions) to the client chart components.
 */

export interface PieSlice {
  label: string;
  valueLabel: string;
  color: string;
  sharePct: number;
}

const SLICE_COLORS = [
  "#c75d3c",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#e11d48",
  "#0891b2",
  "#65a30d",
  "#9333ea",
];

export function buildPieSlices<
  T extends { sharePct: number; netMinor: number; title: string }
>(
  items: T[],
  format: (value: number) => string,
  maxItems = 6
): PieSlice[] {
  const top = items.slice(0, maxItems);
  const otherValue = items
    .slice(maxItems)
    .reduce((sum, i) => sum + i.netMinor, 0);
  const otherShare = items
    .slice(maxItems)
    .reduce((sum, i) => sum + i.sharePct, 0);

  const slices: PieSlice[] = top.map((item, idx) => ({
    label: item.title,
    valueLabel: format(item.netMinor),
    color: SLICE_COLORS[idx % SLICE_COLORS.length],
    sharePct: item.sharePct,
  }));

  if (otherValue > 0) {
    slices.push({
      label: "Other",
      valueLabel: format(otherValue),
      color: "#9ca3af",
      sharePct: Math.round(otherShare * 10) / 10,
    });
  }

  return slices;
}

export interface RankedBar {
  label: string;
  value: number;
  valueLabel: string;
  secondary?: string;
  color?: string;
}

export function buildRankedBars<
  T extends { title: string; netMinor: number; sharePct: number }
>(items: T[], format: (value: number) => string): RankedBar[] {
  return items.map((item) => ({
    label: item.title,
    value: item.netMinor,
    valueLabel: format(item.netMinor),
    secondary: `${item.sharePct}% of revenue`,
  }));
}
