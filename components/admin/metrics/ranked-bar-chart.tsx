import type { RankedBar } from "@/lib/metrics/chart-data";

interface RankedBarChartProps {
  title: string;
  bars: RankedBar[];
  hint?: string;
  maxBars?: number;
}

export function RankedBarChart({
  title,
  bars,
  hint,
  maxBars = 8,
}: RankedBarChartProps) {
  const displayed = bars.slice(0, maxBars);
  const max = Math.max(1, ...displayed.map((b) => b.value));

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold text-neutral-950">{title}</h3>
        {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
      </div>

      {displayed.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">
          No sales in this window yet.
        </p>
      ) : (
        <ol className="mt-5 space-y-4" aria-label={`${title} ranking`}>
          {displayed.map((bar, index) => {
            const widthPct = Math.max(3, (bar.value / max) * 100);
            return (
              <li key={bar.label}>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-neutral-100 text-xs font-bold tabular-nums text-neutral-500"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                    {bar.label}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-950">
                    {bar.valueLabel}
                  </span>
                </div>
                <div className="ml-9 mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-terracotta-600 to-terracotta-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  {bar.secondary ? (
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-neutral-500">
                      {bar.secondary}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
