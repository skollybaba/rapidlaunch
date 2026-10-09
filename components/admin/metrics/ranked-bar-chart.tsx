"use client";

import { cn } from "@/lib/utils";

interface RankedBar {
  label: string;
  value: number;
  secondary?: string;
  color?: string;
}

interface RankedBarChartProps {
  title: string;
  bars: RankedBar[];
  formatValue: (value: number) => string;
  hint?: string;
  maxBars?: number;
}

export function RankedBarChart({
  title,
  bars,
  formatValue,
  hint,
  maxBars = 10,
}: RankedBarChartProps) {
  const displayed = bars.slice(0, maxBars);
  const max = Math.max(1, ...displayed.map((b) => b.value));

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-500">{title}</h3>
          <p className="mt-1 text-2xl font-bold text-neutral-950">
            {displayed.length} items
          </p>
        </div>
        {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
      </div>

      <ol className="mt-6 space-y-3" aria-label={`${title} ranking`}>
        {displayed.map((bar, index) => {
          const widthPct = (bar.value / max) * 100;
          const rank = index + 1;

          return (
            <li
              key={bar.label}
              className="relative"
              title={`${bar.label}: ${formatValue(bar.value)}`
                + (bar.secondary ? ` (${bar.secondary})` : "")
              }
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-neutral-400 font-mono text-sm">
                  {rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {bar.label}
                  </p>
                  {bar.secondary && (
                    <p className="text-xs text-neutral-500">{bar.secondary}</p>
                  )}
                </div>
                <div className="relative w-48 flex-shrink-0">
                  <div
                    className={cn(
                      "rounded-[4px] h-6 transition-all duration-300",
                      bar.color ? `bg-[${bar.color}]` : "bg-terracotta-600"
                    )}
                    style={{ width: `${widthPct}%` }}
                  >
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs font-medium">
                      {formatValue(bar.value)}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function buildRankedBars<
  T extends { title: string; netMinor: number; sharePct: number }
>(items: T[], formatValue: (v: number) => string): RankedBar[] {
  return items.map((item) => ({
    label: item.title,
    value: item.netMinor,
    secondary: `${item.sharePct}% of revenue`,
    color: undefined,
  }));
}