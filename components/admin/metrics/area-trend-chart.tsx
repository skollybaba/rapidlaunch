import { cn } from "@/lib/utils";

export interface AreaPoint {
  label: string;
  value: number;
  valueLabel: string;
}

interface AreaTrendChartProps {
  title: string;
  subtitle?: string;
  points: AreaPoint[];
  totalLabel?: string;
  color?: "terracotta" | "lavender" | "ai";
  className?: string;
}

const COLOR_CONFIG: Record<
  NonNullable<AreaTrendChartProps["color"]>,
  { stroke: string; from: string; to: string }
> = {
  terracotta: { stroke: "#c75d3c", from: "rgba(199,93,60,0.22)", to: "rgba(199,93,60,0)" },
  lavender: { stroke: "#7c5cfc", from: "rgba(124,92,252,0.20)", to: "rgba(124,92,252,0)" },
  ai: { stroke: "#1ca6b8", from: "rgba(28,166,184,0.20)", to: "rgba(28,166,184,0)" },
};

const VIEW_W = 600;
const VIEW_H = 220;
const PAD_TOP = 14;
const PAD_BOTTOM = 30;
const INNER_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

interface XY {
  x: number;
  y: number;
}

function buildSmoothPath(pts: XY[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaTrendChart({
  title,
  subtitle,
  points,
  totalLabel,
  color = "terracotta",
  className,
}: AreaTrendChartProps) {
  const config = COLOR_CONFIG[color];
  const max = Math.max(1, ...points.map((p) => p.value));

  const xy: XY[] = points.map((point, index) => {
    const x =
      points.length === 1
        ? VIEW_W / 2
        : (index / (points.length - 1)) * VIEW_W;
    const y = PAD_TOP + INNER_H - (point.value / max) * INNER_H;
    return { x, y };
  });

  const linePath = buildSmoothPath(xy);
  const areaPath =
    linePath && xy.length > 0
      ? `${linePath} L ${xy[xy.length - 1].x} ${VIEW_H} L ${xy[0].x} ${VIEW_H} Z`
      : "";

  const gradientId = `area-${color}`;

  const xLabelIndexes = new Set<number>();
  if (points.length > 0) {
    const maxLabels = 6;
    const step = Math.max(1, Math.ceil(points.length / maxLabels));
    for (let i = 0; i < points.length; i += step) xLabelIndexes.add(i);
    xLabelIndexes.add(points.length - 1);
  }

  return (
    <div
      className={cn(
        "rounded-[16px] border border-neutral-300 bg-white p-5",
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-neutral-950">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>
          ) : null}
        </div>
        {totalLabel ? (
          <p className="text-lg font-bold tabular-nums text-neutral-950">
            {totalLabel}
          </p>
        ) : null}
      </div>

      {points.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-500">
          No activity in this window yet.
        </p>
      ) : (
        <>
          <div className="relative mt-6 h-48">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={config.from} />
                  <stop offset="100%" stopColor={config.to} />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <line
                  key={fraction}
                  x1={0}
                  x2={VIEW_W}
                  y1={PAD_TOP + fraction * INNER_H}
                  y2={PAD_TOP + fraction * INNER_H}
                  stroke="var(--color-neutral-100)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
              {linePath ? (
                <path
                  d={linePath}
                  fill="none"
                  stroke={config.stroke}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>
          </div>

          <div className="mt-2 flex justify-between gap-1">
            {points.map((point, index) =>
              xLabelIndexes.has(index) ? (
                <span
                  key={`${point.label}-${index}`}
                  className="truncate text-[10px] leading-tight text-neutral-500"
                >
                  {point.label}
                </span>
              ) : (
                <span key={`${point.label}-${index}`} className="flex-1" />
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
