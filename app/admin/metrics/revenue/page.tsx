import "server-only";

import type { Metadata } from "next";
import {
  CircleDollarSign,
  Gift,
  GraduationCap,
  Percent,
  ReceiptText,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react";

import { AnimatedNumber } from "@/components/admin/animated-number";
import { requireAdmin } from "@/lib/auth/admin";
import { getRevenueMetrics } from "@/lib/services/metrics-service";
import { resolveProductFilter } from "@/lib/metrics/product-filter";
import { formatPrice } from "@/lib/utils";
import { buildPieSlices, buildRankedBars } from "@/lib/metrics/chart-data";
import { AreaTrendChart } from "@/components/admin/metrics/area-trend-chart";
import { DonutChart } from "@/components/admin/metrics/donut-chart";
import { MetricsHeader } from "@/components/admin/metrics/metrics-header";
import { RankedBarChart } from "@/components/admin/metrics/ranked-bar-chart";
import { SectionCard } from "@/components/admin/metrics/section-card";
import { StatCard } from "@/components/admin/metrics/stat-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Revenue analytics | Agile Minds Hub",
};

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{
    window?: string;
    start?: string;
    end?: string;
    product?: string;
  }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const data = await getRevenueMetrics(params);
  const {
    window,
    gross,
    net,
    discounts,
    paidOrders,
    discountedOrders,
    uniqueCustomers,
    averageOrder,
    revenueByType,
    productsByRevenue,
    couponSummary,
    purchasedEnrollments,
    bonusEnrollments,
    trend,
  } = data;

  const format = (v: number) => formatPrice(v, "NGN");
  const deltaLabel = `vs ${window.previousLabel.toLowerCase()}`;
  const netDelta = net.deltaPct;

  return (
    <div className="admin-enter flex flex-1 flex-col">
      <MetricsHeader
        title="Revenue analytics"
        subtitle="Where the money comes from — gross, net, discounts and product mix."
        windowKey={window.key}
        windowLabel={window.label}
        rangeStart={window.startDate}
        rangeEnd={window.endDate}
        productId={resolveProductFilter(params.product)?.id}
      />

      <section
        aria-labelledby="net-revenue-heading"
        className="mt-8 rounded-[16px] bg-ink-950 p-6 text-white md:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              id="net-revenue-heading"
              className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60"
            >
              Net revenue · {window.label}
            </p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl md:text-5xl">
              <AnimatedNumber
                value={net.current}
                format="price"
                currency="NGN"
                durationMs={1100}
              />
            </p>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-white/70">
            {typeof netDelta === "number" ? (
              <span
                className={
                  netDelta >= 0
                    ? "inline-flex items-center rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-semibold text-success-600"
                    : "inline-flex items-center rounded-full bg-danger-100 px-2.5 py-0.5 text-xs font-semibold text-danger-600"
                }
              >
                {netDelta >= 0 ? "+" : "−"}
                {Math.abs(netDelta)}%
              </span>
            ) : null}
            {typeof netDelta === "number"
              ? deltaLabel
              : "No prior data to compare"}
          </p>
        </div>
      </section>

      <div className="admin-enter mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Gross revenue"
          value={format(gross.current)}
          deltaPct={gross.deltaPct}
          deltaLabel={deltaLabel}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Discounts given"
          value={format(discounts.current)}
          deltaPct={discounts.deltaPct}
          deltaLabel={deltaLabel}
          icon={Tag}
          tone="danger"
        />
        <StatCard
          label="Avg order value"
          value={format(averageOrder.current)}
          deltaPct={averageOrder.deltaPct}
          deltaLabel={deltaLabel}
          icon={ReceiptText}
        />
        <StatCard
          label="Paid orders"
          value={paidOrders.current.toLocaleString()}
          deltaPct={paidOrders.deltaPct}
          deltaLabel={deltaLabel}
          icon={ShoppingCart}
        />
        <StatCard
          label="Unique customers"
          value={uniqueCustomers.current.toLocaleString()}
          deltaPct={uniqueCustomers.deltaPct}
          deltaLabel={deltaLabel}
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Discounted orders"
          value={discountedOrders.current.toLocaleString()}
          deltaPct={discountedOrders.deltaPct}
          deltaLabel={deltaLabel}
          icon={Percent}
          tone="warning"
        />
      </div>

      <div className="admin-enter mt-6 grid gap-4 lg:grid-cols-12">
        <AreaTrendChart
          className="lg:col-span-8"
          title="Net revenue trend"
          subtitle={window.label}
          totalLabel={format(net.current)}
          points={trend.map((p) => ({
            label: p.label,
            value: p.netMinor,
            valueLabel: format(p.netMinor),
          }))}
        />
        <div className="min-w-0 lg:col-span-4">
          <DonutChart
            title="Revenue by product"
            totalLabel={format(net.current)}
            centerLabel="Net revenue"
            slices={buildPieSlices(productsByRevenue, format)}
            legendTitle={`${productsByRevenue.length} product${
              productsByRevenue.length === 1 ? "" : "s"
            }`}
          />
        </div>
      </div>

      <div className="admin-enter mt-6 grid gap-4 lg:grid-cols-2">
        <RankedBarChart
          title="Products by revenue"
          bars={buildRankedBars(productsByRevenue, format)}
          hint={`Top ${Math.min(productsByRevenue.length, 8)}`}
        />
        <RankedBarChart
          title="Revenue by type"
          bars={buildRankedBars(revenueByType, format)}
          hint="Courses, sessions, and books"
        />
      </div>

      <div className="admin-enter mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Coupon usage"
          subtitle="Discount codes applied in this window"
        >
          {couponSummary.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">
              No coupons were used in this window.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {couponSummary.map((coupon) => (
                <li
                  key={coupon.code}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="rounded-[6px] bg-lavender-100 px-2 py-0.5 font-mono text-xs font-semibold text-ink-700">
                      {coupon.code}
                    </span>
                  </span>
                  <span className="text-sm text-neutral-500">
                    {coupon.orders} order{coupon.orders === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold text-danger-600">
                      −{format(coupon.discountMinor)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Enrollment mix"
          subtitle="Courses unlocked in this window"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[12px] bg-terracotta-100 p-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-terracotta-600">
                <GraduationCap aria-hidden="true" className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-bold tabular-nums text-neutral-950">
                {purchasedEnrollments.toLocaleString()}
              </p>
              <p className="text-sm text-neutral-600">Purchased</p>
            </div>
            <div className="rounded-[12px] bg-ai-violet-soft p-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ai-violet">
                <Gift aria-hidden="true" className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-bold tabular-nums text-neutral-950">
                {bonusEnrollments.toLocaleString()}
              </p>
              <p className="text-sm text-neutral-600">Bonus</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
