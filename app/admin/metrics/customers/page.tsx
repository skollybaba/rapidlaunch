import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Repeat,
  ShoppingBag,
  UserMinus,
  Users,
  Wallet,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/admin";
import { getCustomerMetrics } from "@/lib/services/metrics-service";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsHeader } from "@/components/admin/metrics/metrics-header";
import { SectionCard } from "@/components/admin/metrics/section-card";
import { StatCard } from "@/components/admin/metrics/stat-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customers & LTV | Rapid Launch",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const windowKey = params.window ?? "30d";
  const data = await getCustomerMetrics(windowKey);
  const {
    totalCustomers,
    repeatCustomers,
    repeatRatePct,
    activeThisWindow,
    newThisWindow,
    returningThisWindow,
    churnedPriorCustomers,
    churnRatePct,
    totalRevenueMinor,
    averageLtvMinor,
    customers,
  } = data;

  const format = (v: number) => formatPrice(v, "NGN");

  return (
    <div className="admin-enter flex flex-1 flex-col">
      <MetricsHeader
        title="Customers & LTV"
        subtitle="Lifetime value, retention and your highest-value customers."
        windowKey={windowKey}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total customers"
          value={totalCustomers.toLocaleString()}
          icon={Users}
        />
        <StatCard
          label="Repeat customers"
          value={repeatCustomers.toLocaleString()}
          icon={Repeat}
          hint={`${repeatRatePct}% of all customers`}
          tone="success"
        />
        <StatCard
          label="Active this window"
          value={activeThisWindow.toLocaleString()}
          icon={Activity}
          tone="info"
        />
        <StatCard
          label="Churn rate"
          value={`${churnRatePct}%`}
          icon={UserMinus}
          hint={`${churnedPriorCustomers.toLocaleString()} prior customers`}
          tone="danger"
        />
        <StatCard
          label="Avg lifetime value"
          value={format(averageLtvMinor)}
          icon={Wallet}
          tone="ai"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Customer flow"
          subtitle="Movement within this window"
        >
          <ul className="space-y-3">
            <li className="flex items-center justify-between rounded-[12px] bg-success-100 px-4 py-3">
              <span className="text-sm text-neutral-700">New customers</span>
              <span className="text-lg font-bold tabular-nums text-success-600">
                {newThisWindow.toLocaleString()}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-[12px] bg-ai-violet-soft px-4 py-3">
              <span className="text-sm text-neutral-700">
                Returning customers
              </span>
              <span className="text-lg font-bold tabular-nums text-ai-violet">
                {returningThisWindow.toLocaleString()}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-[12px] bg-warning-100 px-4 py-3">
              <span className="text-sm text-neutral-700">
                Churned (prior customers)
              </span>
              <span className="text-lg font-bold tabular-nums text-warning-600">
                {churnedPriorCustomers.toLocaleString()}
              </span>
            </li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Revenue concentration"
          subtitle="All-time, across every customer"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[12px] bg-neutral-100 p-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-terracotta-600">
                <ShoppingBag aria-hidden="true" className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-bold tabular-nums text-neutral-950">
                {format(totalRevenueMinor)}
              </p>
              <p className="text-sm text-neutral-600">Lifetime revenue</p>
            </div>
            <div className="rounded-[12px] bg-neutral-100 p-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-terracotta-600">
                <Wallet aria-hidden="true" className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-bold tabular-nums text-neutral-950">
                {format(averageLtvMinor)}
              </p>
              <p className="text-sm text-neutral-600">Average LTV</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <section className="mt-4 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <h2 className="text-base font-bold text-neutral-950">
              Top customers
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              Ranked by lifetime revenue
            </p>
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No customers yet"
              description="Once orders are paid, your highest-value customers will appear here."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 text-right font-semibold">Orders</th>
                  <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                  <th className="px-5 py-3 font-semibold">First purchase</th>
                  <th className="px-5 py-3 font-semibold">Last purchase</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {customers.map((customer) => (
                  <tr key={customer.email} className="hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-xs font-bold uppercase text-terracotta-600"
                        >
                          {customer.email.charAt(0)}
                        </span>
                        <span className="font-medium text-neutral-950">
                          {customer.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                      {customer.orders}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-neutral-950">
                      {format(customer.revenueMinor)}
                    </td>
                    <td className="px-5 py-3 text-neutral-500">
                      {new Date(customer.firstPurchase).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-neutral-500">
                      {new Date(customer.lastPurchase).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      {customer.isRepeatCustomer ? (
                        <Badge tone="success">Repeat</Badge>
                      ) : (
                        <Badge>One-time</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/metrics/customers/${encodeURIComponent(
                          customer.email
                        )}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 hover:text-terracotta-500"
                      >
                        View
                        <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
