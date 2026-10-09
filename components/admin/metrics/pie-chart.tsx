"use client";

import { cn } from "@/lib/utils";

interface PieSlice {
  label: string;
  value: number;
  color: string;
  sharePct: number;
}

interface PieChartProps {
  title: string;
  slices: PieSlice[];
  totalValue: number;
  formatValue: (value: number) => string;
  legendTitle?: string;
}

export function PieChart({
  title,
  slices,
  totalValue,
  formatValue,
  legendTitle,
}: PieChartProps) {
  const sorted = [...slices].sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-500">{title}</h3>
          <p className="mt-1 text-2xl font-bold text-neutral-950">
            {formatValue(totalValue)}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <div className="flex items-center justify-center" style={{ width: 200, height: 200 }}>
          <svg viewBox="0 0 100 100" style={{ width: 200, height: 200 }}>
            {sorted.map((slice, index) => {
              const startAngle = -90;
              const circumference = 2 * Math.PI * 45;
              const sliceAngle = (slice.sharePct / 100) * 360;
              const strokeDashoffset = circumference - (slice.sharePct / 100) * circumference;
              
              return (
                <circle
                  key={slice.label}
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="30"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(${startAngle} 50 50)`}
                  style={{ transformOrigin: "50px 50px" }}
                />
              );
            })}
          </svg>
        </div>

        <div className="flex-1 min-w-[180px] space-y-3">
          {sorted.map((slice, index) => (
            <div
              key={slice.label}
              className="flex items-center gap-3"
              title={`${slice.label}: ${slice.sharePct}%`}
            >
              <div
                className="h-3 w-3 rounded-[4px] flex-shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {slice.label}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatValue(slice.value)} &nbsp;({slice.sharePct}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {legendTitle && (
        <p className="mt-4 text-xs text-neutral-500 text-center">{legendTitle}</p>
      )}
    </div>
  );
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
  maxItems = 6
): PieSlice[] {
  const top = items.slice(0, maxItems);
  const otherValue = items
    .slice(maxItems)
    .reduce((sum, i) => sum + i.netMinor, 0);
  const otherShare = items
    .slice(maxItems)
    .reduce((sum, i) => sum + i.sharePct, 0);

  const slices = top.map((item, idx) => ({
    label: item.title,
    value: item.netMinor,
    color: SLICE_COLORS[idx % SLICE_COLORS.length],
    sharePct: item.sharePct,
  }));

  if (otherValue > 0) {
    slices.push({
      label: "Other",
      value: otherValue,
      color: "#9ca3af",
      sharePct: Math.round(otherShare * 10) / 10,
    });
  }

  return slices;
}