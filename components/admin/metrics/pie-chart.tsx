"use client";

import type { PieSlice } from "@/lib/metrics/chart-data";

interface PieChartProps {
  title: string;
  slices: PieSlice[];
  totalLabel: string;
  legendTitle?: string;
}

export function PieChart({
  title,
  slices,
  totalLabel,
  legendTitle,
}: PieChartProps) {
  const sorted = [...slices].sort((a, b) => b.sharePct - a.sharePct);

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-500">{title}</h3>
          <p className="mt-1 text-2xl font-bold text-neutral-950">{totalLabel}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <div className="flex items-center justify-center" style={{ width: 200, height: 200 }}>
          <svg viewBox="0 0 100 100" style={{ width: 200, height: 200 }}>
            {sorted.map((slice) => {
              const startAngle = -90;
              const circumference = 2 * Math.PI * 45;
              const strokeDashoffset =
                circumference - (slice.sharePct / 100) * circumference;

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
          {sorted.map((slice) => (
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
                  {slice.valueLabel} &nbsp;({slice.sharePct}%)
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
