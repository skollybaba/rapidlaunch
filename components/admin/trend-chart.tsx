import { cn } from "@/lib/utils";

interface TrendBar {
  label: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  hint?: string;
  bars: TrendBar[];
  formatValue: (value: number) => string;
  totalLabel?: string;
  color?: "terracotta" | "lavender";
}

export function TrendChart({
  title,
  hint,
  bars,
  formatValue,
  totalLabel,
  color = "terracotta",
}: TrendChartProps) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const total = bars.reduce((sum, b) => sum + b.value, 0);

  const barColor =
    color === "terracotta" ? "bg-terracotta-600" : "bg-lavender-200";

  function showLabel(index: number) {
    return (
      bars.length <= 13 || index % 5 === 0 || index === bars.length - 1
    );
  }

  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-500">{title}</h3>
          <p className="mt-1 text-2xl font-bold text-neutral-950">
            {totalLabel ?? formatValue(total)}
          </p>
        </div>
        {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
      </div>

      <ol
        className="mt-6 flex h-40 items-end gap-1.5"
        aria-label={`${title} trend`}
      >
        {bars.map((bar, index) => (
          <li
            key={`${bar.label}-${index}`}
            className="flex h-full flex-1 flex-col justify-end"
            title={`${bar.label}: ${formatValue(bar.value)}`}
          >
            <div
              aria-hidden="true"
              className={cn(
                "w-full rounded-t-[4px] animate-bar-grow",
                bar.value > 0 ? barColor : "bg-neutral-200"
              )}
              style={{
                height: `${Math.round((bar.value / max) * 100)}%`,
                animationDelay: `${index * 22}ms`,
              }}
            />
          </li>
        ))}
      </ol>

      <div className="mt-2 flex gap-1.5">
        {bars.map((bar, index) => (
          <div
            key={index}
            className="flex-1 text-center text-[10px] leading-tight text-neutral-500"
          >
            {showLabel(index) ? bar.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}