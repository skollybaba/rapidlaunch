"use client";

import { cn } from "@/lib/utils";

interface FunnelStep {
  key: string;
  label: string;
  count: number;
  lossPct?: number;
}

interface FunnelChartProps {
  title: string;
  steps: FunnelStep[];
  hint?: string;
}

export function FunnelChart({ title, steps, hint }: FunnelChartProps) {
  const maxCount = Math.max(1, ...steps.map((s) => s.count));

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-500">{title}</h3>
          <p className="mt-1 text-2xl font-bold text-neutral-950">
            {steps[steps.length - 1]?.count.toLocaleString() ?? 0}
          </p>
        </div>
        {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
      </div>

      <ol className="mt-6 space-y-4" aria-label={`${title} funnel`}>
        {steps.map((step, index) => {
          const widthPct = (step.count / maxCount) * 100;
          const prev = steps[index - 1];
          const loss = prev && prev.count > step.count ? prev.count - step.count : 0;
          const lossPct = prev && prev.count > 0 ? Math.round((loss / prev.count) * 1000) / 10 : 0;

          return (
            <li key={step.key} className="relative">
              <div className="flex items-center gap-3">
                <div
                  className="flex-1"
                  style={{ maxWidth: 400 }}
                >
                  <div
                    className={cn(
                      "rounded-[8px] h-14 transition-all duration-300",
                      index === 0
                        ? "bg-terracotta-600"
                        : index === steps.length - 1
                          ? "bg-lavender-600"
                          : "bg-neutral-400"
                    )}
                    style={{ width: `${widthPct}%` }}
                  >
                    <div className="flex items-center h-full px-4 text-white font-medium text-sm">
                      {step.label} <span className="ml-2 opacity-80">{step.count.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {loss > 0 && (
                  <div className="flex items-center text-red-600 text-sm font-medium whitespace-nowrap">
                    -{loss.toLocaleString()} ({lossPct}%)
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-terracotta-600" />
          Entry
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-neutral-400" />
          Steps
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-lavender-600" />
          Success
        </span>
      </div>
    </div>
  );
}