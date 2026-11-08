"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn, formatPrice } from "@/lib/utils";
import { buildSmoothPath, type XY } from "@/lib/metrics/chart-path";
import type { ProfitMonthPoint, ProfitTotals } from "@/types/profit";

type ChartMode = "monthly" | "cumulative";

interface ProfitTrendChartProps {
  points: ProfitMonthPoint[];
  totals: ProfitTotals;
  loading?: boolean;
  className?: string;
}

const VIEW_W = 640;
const VIEW_H = 240;
const PAD_TOP = 16;
const PAD_BOTTOM = 34;
const INNER_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

function formatMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function formatAxis(minor: number) {
  const naira = minor / 100;
  const formatted = new Intl.NumberFormat("en-NG", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(naira);
  return `${naira < 0 ? "−" : ""}₦${formatted.replace("-", "")}`;
}

function formatMoney(minor: number) {
  return formatPrice(Math.round(minor || 0), "NGN");
}

export function ProfitTrendChart({
  points,
  totals,
  loading = false,
  className,
}: ProfitTrendChartProps) {
  const [mode, setMode] = useState<ChartMode>("monthly");

  const series = useMemo(
    () =>
      points.map((point) => ({
        month: point.month,
        label: formatMonth(point.month),
        value:
          mode === "monthly"
            ? point.profitMinor
            : point.cumulativeProfitMinor,
        monthlyProfitMinor: point.profitMinor,
        cumulativeProfitMinor: point.cumulativeProfitMinor,
        paidOrders: point.paidOrders,
      })),
    [points, mode]
  );

  const values = series.map((s) => s.value);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;

  const yFor = (value: number) =>
    PAD_TOP + ((max - value) / span) * INNER_H;
  const zeroY = yFor(0);

  const slot = series.length > 0 ? VIEW_W / series.length : VIEW_W;
  const barWidth = Math.max(3, Math.min(26, slot * 0.6));
  const centerX = (index: number) => slot * index + slot / 2;

  const labelIndexes = new Set<number>();
  if (series.length > 0) {
    const step = Math.max(1, Math.ceil(series.length / 8));
    for (let i = 0; i < series.length; i += step) labelIndexes.add(i);
    labelIndexes.add(series.length - 1);
  }

  const xy: XY[] = series.map((point, index) => ({
    x: centerX(index),
    y: yFor(point.value),
  }));
  const linePath = buildSmoothPath(xy);
  const areaPath =
    linePath && xy.length > 0
      ? `${linePath} L ${xy[xy.length - 1].x} ${zeroY} L ${xy[0].x} ${zeroY} Z`
      : "";

  const finalValue = series.length > 0 ? series[series.length - 1].value : 0;
  const cumulativePositive = finalValue >= 0;
  const lineColor = cumulativePositive ? "#159447" : "#c93737";

  const totalsLabel =
    mode === "monthly" ? "All-time profit" : "Profit to date";
  const totalsValue =
    mode === "monthly" ? totals.profitMinor : finalValue;

  return (
    <section
      className={cn(
        "rounded-[16px] border border-neutral-300 bg-white p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-950">
            Profitability over time
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            After Paystack fees and recorded expenses, month by month from
            inception.
          </p>
        </div>
        <div
          role="group"
          aria-label="Profit chart view"
          className="flex rounded-[10px] bg-lavender-100 p-1"
        >
          {(
            [
              { key: "monthly", label: "Monthly" },
              { key: "cumulative", label: "To date" },
            ] as const
          ).map((option) => {
            const active = option.key === mode;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setMode(option.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-[7px] px-3 py-1.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "bg-white text-terracotta-600 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-950"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] bg-neutral-100 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
            {totalsLabel}
          </dt>
          <dd
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 text-lg font-bold tabular-nums",
              totalsValue >= 0 ? "text-success-600" : "text-danger-600"
            )}
          >
            {totalsValue >= 0 ? (
              <TrendingUp aria-hidden="true" className="h-4 w-4" />
            ) : (
              <TrendingDown aria-hidden="true" className="h-4 w-4" />
            )}
            {formatMoney(totalsValue)}
          </dd>
        </div>
        <div className="rounded-[12px] bg-neutral-100 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
            Profitable months
          </dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-neutral-950">
            {totals.profitableMonths}
            <span className="text-sm font-normal text-neutral-500">
              {" "}
              / {totals.months}
            </span>
          </dd>
        </div>
        <div className="rounded-[12px] bg-neutral-100 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
            Months in the red
          </dt>
          <dd
            className={cn(
              "mt-1 text-lg font-bold tabular-nums",
              totals.lossMonths > 0 ? "text-danger-600" : "text-neutral-950"
            )}
          >
            {totals.lossMonths}
          </dd>
        </div>
      </dl>

      {loading ? (
        <div className="mt-6 h-48 animate-pulse rounded-[12px] bg-neutral-100" />
      ) : series.length === 0 ? (
        <p className="py-14 text-center text-sm text-neutral-500">
          No paid orders yet. Profitability appears here after your first
          verified payment.
        </p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`${mode === "monthly" ? "Monthly" : "Cumulative"} profit chart from ${series[0].label} to ${series[series.length - 1].label}. Profitable months: ${totals.profitableMonths} of ${totals.months}.`}
            className="relative mt-6"
          >
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              className="h-48 w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="profit-area" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={lineColor}
                    stopOpacity={cumulativePositive ? 0.24 : 0.08}
                  />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Horizontal guides: max, zero, min */}
              <line
                x1={0}
                x2={VIEW_W}
                y1={yFor(max)}
                y2={yFor(max)}
                stroke="var(--color-neutral-100)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={0}
                x2={VIEW_W}
                y1={yFor(min)}
                y2={yFor(min)}
                stroke="var(--color-neutral-100)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />

              {mode === "cumulative" ? (
                <>
                  {areaPath ? (
                    <path d={areaPath} fill="url(#profit-area)" />
                  ) : null}
                  {linePath ? (
                    <path
                      d={linePath}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {xy.length > 0 ? (
                    <circle
                      cx={xy[xy.length - 1].x}
                      cy={xy[xy.length - 1].y}
                      r={3.5}
                      fill={lineColor}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                </>
              ) : (
                series.map((point, index) => {
                  const valueY = yFor(point.value);
                  const zero = zeroY;
                  const top = Math.min(valueY, zero);
                  const height = Math.max(1, Math.abs(zero - valueY));
                  return (
                    <rect
                      key={point.month}
                      x={centerX(index) - barWidth / 2}
                      y={top}
                      width={barWidth}
                      height={height}
                      rx={2}
                      fill={
                        point.value >= 0
                          ? "var(--color-success-600)"
                          : "var(--color-danger-600)"
                      }
                      opacity={point.value === 0 ? 0.25 : 0.9}
                    >
                      <title>
                        {`${point.label}: ${formatMoney(point.monthlyProfitMinor)} profit · ${formatMoney(point.cumulativeProfitMinor)} to date · ${point.paidOrders} paid order${point.paidOrders === 1 ? "" : "s"}`}
                      </title>
                    </rect>
                  );
                })
              )}

              {/* Zero baseline */}
              <line
                x1={0}
                x2={VIEW_W}
                y1={zeroY}
                y2={zeroY}
                stroke="var(--color-neutral-500)"
                strokeWidth={1}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <span
              aria-hidden="true"
              className="absolute right-0 -translate-y-1/2 rounded-[4px] bg-white px-1 text-[10px] font-semibold text-neutral-500"
              style={{
                top: `${(zeroY / VIEW_H) * 100}%`,
              }}
            >
              {formatAxis(0)}
            </span>
            {max > 0 ? (
              <span
                aria-hidden="true"
                className="absolute left-0 -translate-y-1/2 rounded-[4px] bg-white px-1 text-[10px] font-semibold text-success-600"
                style={{ top: `${(yFor(max) / VIEW_H) * 100}%` }}
              >
                {formatAxis(max)}
              </span>
            ) : null}
            {min < 0 ? (
              <span
                aria-hidden="true"
                className="absolute left-0 -translate-y-1/2 rounded-[4px] bg-white px-1 text-[10px] font-semibold text-danger-600"
                style={{ top: `${(yFor(min) / VIEW_H) * 100}%` }}
              >
                {formatAxis(min)}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex justify-between gap-1">
            {series.map((point, index) =>
              labelIndexes.has(index) ? (
                <span
                  key={point.month}
                  className="truncate text-[10px] leading-tight text-neutral-500"
                >
                  {point.label}
                </span>
              ) : (
                <span key={point.month} className="flex-1" />
              )
            )}
          </div>

          <table className="sr-only">
            <caption>
              Monthly profit from {series[0].label} to{" "}
              {series[series.length - 1].label}
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Profit</th>
                <th scope="col">Cumulative profit</th>
                <th scope="col">Paid orders</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.month}>
                  <th scope="row">{point.label}</th>
                  <td>{formatMoney(point.monthlyProfitMinor)}</td>
                  <td>{formatMoney(point.cumulativeProfitMinor)}</td>
                  <td>{point.paidOrders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
        Each month uses the fee settings and expenses from its saved report.
        Months without a saved report assume 1.5% Paystack fees and no expenses.
      </p>
    </section>
  );
}
