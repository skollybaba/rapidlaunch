import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import { getRevenueMetrics } from "@/lib/services/metrics-service";
import { formatPrice } from "@/lib/utils";
import { buildPieSlices, buildRankedBars } from "@/lib/metrics/chart-data";
import { PieChart } from "@/components/admin/metrics/pie-chart";
import { RankedBarChart } from "@/components/admin/metrics/ranked-bar-chart";
import { TrendChart } from "@/components/admin/trend-chart";
import { WindowSelector } from "@/components/admin/metrics/window-selector";

export const dynamic = "force-dynamic";

async function getRevenueData(searchParams: Promise<{ window?: string }>) {
  const params = await searchParams;
  const windowKey = params.window ?? "30d";
  return getRevenueMetrics(windowKey);
}

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center">Access denied</div>;
  }

  const data = await getRevenueData(searchParams);
  const { window, gross, net, paidOrders, uniqueCustomers, revenueByType, productsByRevenue, couponSummary, purchasedEnrollments, bonusEnrollments, trend } = data;

  const format = (v: number) => formatPrice(v, "NGN");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Revenue analytics</h1>
          <p className="text-neutral-500 mt-1">
            Track revenue by product, type and discount usage.
          </p>
        </div>
        <WindowSelector windowKey={window.key} />
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Gross revenue" value={format(gross.current)} delta={gross.deltaPct} />
        <KpiCard label="Net revenue" value={format(net.current)} delta={net.deltaPct} />
        <KpiCard label="Paid orders" value={paidOrders.current.toLocaleString()} delta={paidOrders.deltaPct} />
        <KpiCard label="Unique customers" value={uniqueCustomers.current.toLocaleString()} delta={uniqueCustomers.deltaPct} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <PieChart
            title="Revenue by product"
            slices={buildPieSlices(productsByRevenue, format)}
            totalLabel={format(net.current)}
            legendTitle={`${productsByRevenue.length} products in window`}
          />
        </div>
        <div>
          <RankedBarChart
            title="Products by revenue"
            bars={buildRankedBars(productsByRevenue, format)}
            hint={`${productsByRevenue.length} products`}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <TrendChart
            title="Net revenue trend"
            bars={trend.map((p) => ({ label: p.label, value: p.netMinor }))}
            formatValue={format}
            color="terracotta"
            totalLabel={format(net.current)}
          />
        </div>
        <div>
          <TrendChart
            title="Revenue by type"
            bars={revenueByType.map((r) => ({ label: r.title, value: r.netMinor }))}
            formatValue={format}
            color="lavender"
          />
        </div>
      </div>

      {couponSummary.length > 0 && (
        <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-500">Coupon usage</h3>
          <ul className="mt-4 space-y-2">
            {couponSummary.map((c) => (
              <li key={c.code} className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-900">{c.code}</span>
                <span className="text-neutral-500">
                  {c.orders} orders, {format(c.discountMinor)} discount
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-500">Enrollment mix</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-[12px] bg-terracotta-50">
            <p className="text-sm text-neutral-500">Purchased enrollments</p>
            <p className="text-2xl font-bold text-terracotta-900">{purchasedEnrollments.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-[12px] bg-lavender-50">
            <p className="text-sm text-neutral-500">Bonus enrollments</p>
            <p className="text-2xl font-bold text-purple-900">{bonusEnrollments.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
      {delta !== null && (
        <p className={`mt-1 text-sm font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {delta >= 0 ? "+" : ""}{delta}% vs prev
        </p>
      )}
    </div>
  );
}
