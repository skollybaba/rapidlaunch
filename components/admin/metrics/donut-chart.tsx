"use client";

import { useState } from "react";

import type { PieSlice } from "@/lib/metrics/chart-data";
import { cn } from "@/lib/utils";

interface DonutChartProps {
  title: string;
  totalLabel: string;
  centerLabel?: string;
  slices: PieSlice[];
  legendTitle?: string;
}

const RADIUS = 42;
const STROKE = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function computeArcs(slices: PieSlice[]) {
  const sorted = [...slices].sort((a, b) => b.sharePct - a.sharePct);
  const arcs: Array<PieSlice & { start: number }> = [];
  let cumulative = 0;
  for (const slice of sorted) {
    arcs.push({ ...slice, start: cumulative });
    cumulative += slice.sharePct;
  }
  return arcs;
}

export function DonutChart({
  title,
  totalLabel,
  centerLabel,
  slices,
  legendTitle,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const arcs = computeArcs(slices);
  const sorted = arcs;

  if (sorted.length === 0) {
    return (
      <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
        <h3 className="text-base font-bold text-neutral-950">{title}</h3>
        <p className="mt-6 py-10 text-center text-sm text-neutral-500">
          No data in this window yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold text-neutral-950">{title}</h3>
        {legendTitle ? (
          <p className="text-xs text-neutral-500">{legendTitle}</p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative h-[190px] w-[190px] shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="var(--color-neutral-100)"
              strokeWidth={STROKE}
            />
            {arcs.map((arc, index) => {
              const length = (arc.sharePct / 100) * CIRCUMFERENCE;
              const rotation = (arc.start / 100) * 360;
              return (
                <circle
                  key={arc.label}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={0}
                  transform={`rotate(${rotation} 50 50)`}
                  className={cn(
                    "transition-opacity duration-[var(--duration-fast)]",
                    activeIndex !== null && activeIndex !== index
                      ? "opacity-30"
                      : "opacity-100"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold tabular-nums text-neutral-950">
              {activeIndex !== null ? arcs[activeIndex].valueLabel : totalLabel}
            </span>
            <span className="mt-0.5 max-w-[120px] truncate text-xs text-neutral-500">
              {activeIndex !== null
                ? arcs[activeIndex].label
                : centerLabel ?? "Total"}
            </span>
          </div>
        </div>

        <ul
          className="w-full flex-1 space-y-1.5"
          aria-label={`${title} breakdown`}
        >
          {sorted.map((slice, index) => (
            <li key={slice.label}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[10px] px-2 py-1.5 text-left transition-colors duration-[var(--duration-fast)]",
                  activeIndex === index ? "bg-neutral-100" : "hover:bg-neutral-100"
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-[4px]"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900">
                    {slice.label}
                  </span>
                  <span className="block text-xs tabular-nums text-neutral-500">
                    {slice.valueLabel}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-700">
                  {slice.sharePct}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
