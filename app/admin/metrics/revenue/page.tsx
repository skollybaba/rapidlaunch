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
  Wallet,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/admin";
import { getRevenueMetrics } from "@/lib/services/metrics-service";
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
  title: "Revenue analytics | Rapid Launch",
};

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const data = await getRevenueMetrics(params.window ?? "30d");
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

  return (
    <div className="admin-enter flex flex-1 flex-col">
      <MetricsHeader
        title="Revenue analytics"
        subtitle="Where the money comes from — gross, net, discounts and product mix."
        windowKey={window.key}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross revenue"
          value={format(gross.current)}
          deltaPct={gross.deltaPct}
          deltaLabel={deltaLabel}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Net revenue"
          value={format(net.current)}
          deltaPct={net.deltaPct}
          deltaLabel={deltaLabel}
          icon={Wallet}
          tone="success"
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
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
          label="Discounted orders"
          value={discountedOrders.current.toLocaleString()}
          deltaPct={discountedOrders.deltaPct}
          deltaLabel={deltaLabel}
          icon={Percent}
          tone="warning"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <DonutChart
          title="Revenue by product"
          totalLabel={format(net.current)}
          centerLabel="Net revenue"
          slices={buildPieSlices(productsByRevenue, format)}
          legendTitle={`${productsByRevenue.length} product${
            productsByRevenue.length === 1 ? "" : "s"
          }`}
        />
        <RankedBarChart
          title="Products by revenue"
          bars={buildRankedBars(productsByRevenue, format)}
          hint={`Top ${Math.min(productsByRevenue.length, 8)}`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AreaTrendChart
          title="Net revenue trend"
          subtitle={window.label}
          totalLabel={format(net.current)}
          points={trend.map((p) => ({
            label: p.label,
            value: p.netMinor,
            valueLabel: format(p.netMinor),
          }))}
        />
        <DonutChart
          title="Revenue by type"
          totalLabel={format(net.current)}
          centerLabel="Net revenue"
          slices={buildPieSlices(revenueByType, format)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
