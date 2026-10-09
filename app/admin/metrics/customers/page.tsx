import "server-only";

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getCustomerMetrics } from "@/lib/services/metrics-service";
import { formatPrice } from "@/lib/utils";
import { WindowSelector } from "@/components/admin/metrics/window-selector";

export const dynamic = "force-dynamic";

async function getCustomerData(searchParams: Promise<{ window?: string }>) {
  const params = await searchParams;
  const windowKey = params.window ?? "30d";
  return getCustomerMetrics(windowKey);
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center">Access denied</div>;
  }

  const params = await searchParams;
  const windowKey = params.window ?? "30d";
  const data = await getCustomerData(searchParams);
  const { totalCustomers, repeatCustomers, repeatRatePct, activeThisWindow, newThisWindow, returningThisWindow, churnedPriorCustomers, churnRatePct, totalRevenueMinor, averageLtvMinor, customers } = data;

  const format = (v: number) => formatPrice(v, "NGN");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Customers & LTV</h1>
          <p className="text-neutral-500 mt-1">
            Customer lifetime value, churn and top customers.
          </p>
        </div>
        <WindowSelector windowKey={windowKey} />
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total customers" value={totalCustomers.toLocaleString()} />
        <KpiCard label="Repeat customers" value={repeatCustomers.toLocaleString()} delta={repeatRatePct} />
        <KpiCard label="Active this window" value={activeThisWindow.toLocaleString()} />
        <KpiCard label="Churn rate" value={`${churnRatePct}%`} />
        <KpiCard label="Avg LTV" value={format(averageLtvMinor)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-500">Customer flow this window</h3>
          <ul className="mt-4 space-y-3">
            <li className="flex items-center justify-between p-3 rounded-[10px] bg-emerald-50">
              <span className="text-sm text-neutral-600">New customers</span>
              <span className="font-semibold text-emerald-700">{newThisWindow.toLocaleString()}</span>
            </li>
            <li className="flex items-center justify-between p-3 rounded-[10px] bg-lavender-50">
              <span className="text-sm text-neutral-600">Returning customers</span>
              <span className="font-semibold text-purple-700">{returningThisWindow.toLocaleString()}</span>
            </li>
            <li className="flex items-center justify-between p-3 rounded-[10px] bg-amber-50">
              <span className="text-sm text-neutral-600">Churned (prior customers)</span>
              <span className="font-semibold text-amber-700">{churnedPriorCustomers.toLocaleString()}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-500">Revenue concentration</h3>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Total lifetime revenue</span>
              <span className="font-semibold text-neutral-900">{format(totalRevenueMinor)}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Average LTV</span>
              <span className="font-semibold text-neutral-900">{format(averageLtvMinor)}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-500">Top customers (lifetime)</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium text-right">Orders</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
                <th className="pb-2 font-medium text-right">First purchase</th>
                <th className="pb-2 font-medium text-right">Last purchase</th>
                <th className="pb-2 font-medium">Repeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {customers.map((c) => (
                <tr key={c.email}>
                  <td className="py-3">
                    <Link
                      href={`/admin/metrics/customers/${encodeURIComponent(c.email)}`}
                      className="font-medium text-terracotta-600 hover:underline"
                    >
                      {c.email}
                    </Link>
                  </td>
                  <td className="py-3 text-right text-neutral-900">{c.orders}</td>
                  <td className="py-3 text-right text-neutral-900">{format(c.revenueMinor)}</td>
                  <td className="py-3 text-right text-neutral-500">{new Date(c.firstPurchase).toLocaleDateString()}</td>
                  <td className="py-3 text-right text-neutral-500">{new Date(c.lastPurchase).toLocaleDateString()}</td>
                  <td className="py-3">
                    {c.isRepeatCustomer ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Yes</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
      {delta !== undefined && delta !== null && (
        <p className={`mt-1 text-sm font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {delta >= 0 ? "+" : ""}{delta}% repeat
        </p>
      )}
    </div>
  );
}
