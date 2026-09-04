import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Users,
  Wallet,
} from "lucide-react";

import {
  getDashboardSummary,
  getAdminOrders,
} from "@/lib/services/admin-service";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Back office dashboard | Rapid Launch",
};

function statusTone(status: string) {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "pending";
    case "FAILED":
    case "CANCELLED":
    case "REFUNDED":
      return "error";
    default:
      return "neutral";
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase();
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "warning";
}

function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <div
      className={`rounded-[16px] border p-5 ${
        tone === "warning"
          ? "border-warning-200 bg-warning-50"
          : "border-neutral-300 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
          {label}
        </p>
        <Icon
          aria-hidden="true"
          className={`h-5 w-5 ${tone === "warning" ? "text-warning-600" : "text-terracotta-600"}`}
        />
      </div>
      <p className="mt-3 text-2xl font-bold text-neutral-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [summary, recentOrders] = await Promise.all([
    getDashboardSummary(),
    getAdminOrders({ page: 1, pageSize: 8 }),
  ]);

  const hasIssues =
    summary.fulfillmentIssues > 0 ||
    summary.failedPayments > 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            Back office
          </p>
          <h1 className="mt-1 text-[1.75rem] leading-[1.286]">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            What needs your attention today.
          </p>
        </div>
      </div>

      {hasIssues ? (
        <div className="mt-6 flex items-start gap-3 rounded-[16px] border border-warning-200 bg-warning-50 p-5">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-warning-600"
          />
          <div>
            <p className="text-sm font-bold text-neutral-950">
              Action needed
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-neutral-600">
              {summary.fulfillmentIssues > 0
                ? `${summary.fulfillmentIssues} fulfillment record${
                    summary.fulfillmentIssues === 1 ? "" : "s"
                  } need${summary.fulfillmentIssues === 1 ? "s" : ""} attention.`
                : ""}
              {summary.fulfillmentIssues > 0 && summary.failedPayments > 0
                ? " "
                : ""}
              {summary.failedPayments > 0
                ? `${summary.failedPayments} payment${summary.failedPayments === 1 ? "" : "s"} failed.`
                : ""}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPrice(summary.revenueMinor, summary.currency)}
          hint={`${summary.paidOrders} paid orders of ${summary.totalOrders} total`}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Recent customers"
          value={String(summary.newCustomers)}
          hint="x accounts created (non-admins)"
          icon={Users}
        />
        <StatCard
          label="Upcoming sessions"
          value={String(summary.upcomingBookings)}
          hint={`${summary.pendingBookings} waiting to be confirmed`}
          icon={CalendarClock}
        />
        <StatCard
          label="Pending payments"
          value={String(summary.pendingPayments)}
          hint={`${summary.failedPayments} failed`}
          tone={summary.pendingPayments > 0 || summary.failedPayments > 0 ? "warning" : "default"}
          icon={Wallet}
        />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 hover:text-terracotta-500"
          >
            View all
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
          {recentOrders.rows.length === 0 ? (
            <p className="p-6 text-sm text-neutral-500">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-[0.08em] text-neutral-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Order
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Customer
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Item
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Amount
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {recentOrders.rows.map((order) => {
                    const tone = statusTone(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-neutral-50">
                        <td className="px-5 py-3 font-medium text-neutral-950">
                          {order.orderReference}
                        </td>
                        <td className="px-5 py-3 text-neutral-600">
                          {order.customerEmail}
                        </td>
                        <td className="px-5 py-3 text-neutral-600">
                          {order.itemTitle}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-neutral-950">
                          {formatPrice(order.totalMinor, order.currency)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              tone === "success"
                                ? "border-success-100 bg-success-100 text-success-600"
                                : tone === "pending"
                                  ? "border-warning-100 bg-warning-100 text-warning-600"
                                  : tone === "error"
                                    ? "border-danger-100 bg-danger-100 text-danger-600"
                                    : "border-neutral-300 bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
