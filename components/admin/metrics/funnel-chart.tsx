import { ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface FunnelStep {
  key: string;
  label: string;
  count: number;
}

interface FunnelChartProps {
  title: string;
  steps: FunnelStep[];
  hint?: string;
}

function barColor(index: number, total: number): string {
  if (index === 0) return "bg-terracotta-600";
  if (index === total - 1) return "bg-success-600";
  return "bg-ink-800";
}

export function FunnelChart({ title, steps, hint }: FunnelChartProps) {
  const maxCount = Math.max(1, ...steps.map((s) => s.count));
  const top = steps[0]?.count ?? 0;
  const last = steps[steps.length - 1]?.count ?? 0;
  const conversion = top > 0 ? Math.round((last / top) * 1000) / 10 : 0;

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-neutral-950">{title}</h3>
          <p className="mt-0.5 text-sm text-neutral-500">
            {conversion}% of visitors reach payment
          </p>
        </div>
        {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
      </div>

      <ol className="mt-6 space-y-1" aria-label={`${title} funnel`}>
        {steps.map((step, index) => {
          const widthPct = Math.max(12, (step.count / maxCount) * 100);
          const ofTop = top > 0 ? Math.round((step.count / top) * 1000) / 10 : 0;
          const prev = steps[index - 1];
          const drop = prev && prev.count > step.count ? prev.count - step.count : 0;
          const dropPct =
            prev && prev.count > 0
              ? Math.round((drop / prev.count) * 1000) / 10
              : 0;

          return (
            <li key={step.key}>
              {index > 0 ? (
                <div className="flex items-center justify-center gap-2 py-1.5">
                  <ArrowDown
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-neutral-300"
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      drop > 0 ? "text-danger-600" : "text-neutral-400"
                    )}
                  >
                    {drop > 0
                      ? `−${drop.toLocaleString()} dropped (${dropPct}%)`
                      : "no drop-off"}
                  </span>
                </div>
              ) : null}

              <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 justify-center">
                  <div
                    className={cn(
                      "flex h-14 items-center justify-between gap-3 rounded-[12px] px-4 text-white transition-all duration-[var(--duration-standard)]",
                      barColor(index, steps.length)
                    )}
                    style={{ width: `${widthPct}%` }}
                  >
                    <span className="truncate text-sm font-semibold">
                      {step.label}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      {step.count.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-neutral-500">
                  {ofTop}%
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
