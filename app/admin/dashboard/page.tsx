import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Clock4,
  GraduationCap,
  Receipt,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

import { TrendChart } from "@/components/admin/trend-chart";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getAdminOrders,
  getNextUpcomingSession,
} from "@/lib/services/admin-service";
import {
  getInsights,
  type InsightsPeriod,
} from "@/lib/services/insights-service";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard & Insights | Rapid Launch",
};

const PERIOD_OPTIONS: { value: InsightsPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase();
}

function statusTone(status: string): BadgeTone {
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

function enrollmentTone(status: string): BadgeTone {
  switch (status) {
    case "FULFILLED":
      return "success";
    case "PENDING":
    case "RETRY_PENDING":
      return "pending";
    case "ACTION_REQUIRED":
    case "FAILED":
      return "error";
    default:
      return "neutral";
  }
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "warning";
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: StatCardProps) {
  return (
    <div
      className={`rounded-[16px] border p-5 ${
        tone === "warning"
          ? "border-warning-100 bg-warning-100"
          : "border-neutral-300 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
          {label}
        </p>
        <Icon
          aria-hidden="true"
          className={`h-5 w-5 ${
            tone === "warning" ? "text-warning-600" : "text-terracotta-600"
          }`}
        />
      </div>
      <p className="mt-3 text-2xl font-bold text-neutral-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const [recentOrders, snapshot, nextSessionResult] = await Promise.all([
    getAdminOrders({ page: 1, pageSize: 8 }),
    getInsights(sp.period),
    getNextUpcomingSession(),
  ]);

  const { kpis, trend, productsByRevenue, ordersByStatus, operations } =
    snapshot;
  const recentEnrollments = snapshot.recentEnrollments;
  const nextSession = nextSessionResult.session;

  const attention: { label: string; count: number; href: string }[] = [];
  if (operations.pendingBookings > 0)
    attention.push({
      label: "pending booking",
      count: operations.pendingBookings,
      href: "/admin/bookings?status=PENDING",
    });

  const attentionCtas = Array.from(
    new Map(
      attention.map((item) => [
        item.href,
        {
          href: item.href,
          label: item.href.startsWith("/admin/orders")
            ? "Review payments"
            : item.href.startsWith("/admin/bookings")
              ? "Review bookings"
              : "Review",
        },
      ])
    ).values()
  );

  const totalStatuses = ordersByStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="admin-enter flex flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            Back office
          </p>
          <h1 className="mt-1 text-[32px] leading-[1.286] md:text-[1.75rem]">
            Dashboard &amp; Insights
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            What needs your attention today — {snapshot.windowDescription}.
          </p>
        </div>

        <div
          role="group"
          aria-label="Time period"
          className="flex rounded-pill border border-neutral-300 bg-white p-1"
        >
          {PERIOD_OPTIONS.map((option) => {
            const active = option.value === snapshot.period;
            return (
              <Link
                key={option.value}
                href={`/admin/dashboard?period=${option.value}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ${
                  active
                    ? "bg-ink-900 text-white"
                    : "text-neutral-500 hover:text-neutral-950"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      {nextSession ? (
        <section className="admin-enter mt-6 overflow-hidden rounded-[16px] bg-ink-900 p-6 text-white sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta-600">
                <CalendarClock
                  aria-hidden="true"
                  className="h-5 w-5 text-white"
                />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                  Next session
                </p>
                <p className="mt-1 text-2xl font-bold leading-snug">
                  {nextSession.productTitle}
                </p>
              </div>
            </div>
            <Link
              href="/admin/bookings?range=upcoming"
              className="inline-flex items-center gap-1.5 rounded-pill bg-white px-4 py-2 text-sm font-semibold text-ink-900 transition-colors duration-[var(--duration-fast)] hover:bg-white/90"
            >
              View bookings
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-sm font-semibold text-white">
                {nextSession.customerName || nextSession.customerEmail}
              </p>
              {nextSession.customerName ? (
                <p className="mt-0.5 text-xs text-white/60">
                  {nextSession.customerEmail}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white/80">
                {formatDateTime(nextSession.scheduledStartTime)}
              </span>
              {nextSession.status !== "CONFIRMED" ? (
                <span className="rounded-full bg-warning-100 px-2.5 py-0.5 text-xs font-semibold text-warning-600">
                  Pending confirmation
                </span>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {attention.length > 0 ? (
        <section className="admin-enter mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-warning-100 bg-warning-100 px-5 py-4">
          <p className="flex items-center gap-2.5 text-sm font-semibold text-neutral-950">
            <AlertTriangle
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-warning-600"
            />
            <span>
              {attention
                .map(
                  (item) =>
                    `${item.count} ${item.label}${item.count === 1 ? "" : "s"}`
                )
                .join(" · ")}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {attentionCtas.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                className="inline-flex items-center gap-1.5 rounded-pill border border-warning-600 bg-white px-4 py-2 text-sm font-semibold text-warning-600 transition-colors duration-[var(--duration-fast)] hover:bg-warning-100"
              >
                {cta.label}
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="admin-enter mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Revenue"
          value={formatPrice(kpis.revenueMinor)}
          hint="paid revenue in this period"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Paid orders"
          value={String(kpis.paidOrders)}
          hint={`${kpis.ordersCreated} created · ${kpis.conversionRate}% converted`}
          icon={ShoppingCart}
        />
        <StatCard
          label="Avg order value"
          value={formatPrice(kpis.averageOrderMinor)}
          hint="per paid order"
          icon={Receipt}
        />
        <StatCard
          label="New customers"
          value={String(kpis.newCustomers)}
          hint="accounts created in period"
          icon={Users}
        />
        <StatCard
          label="Enrollments"
          value={String(kpis.enrollments)}
          hint={`${kpis.enrollmentPending} pending · ${kpis.enrollmentIssues} need attention`}
          tone={kpis.enrollmentIssues > 0 ? "warning" : "default"}
          icon={GraduationCap}
        />
      </div>

      <div className="admin-enter mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart
          title="Revenue"
          hint={snapshot.windowDescription}
          bars={trend.map((t) => ({ label: t.label, value: t.revenueMinor }))}
          formatValue={(v) => formatPrice(v)}
        />
        <TrendChart
          title="Enrollments"
          hint="Classroom enrollments"
          bars={trend.map((t) => ({ label: t.label, value: t.enrollments }))}
          formatValue={(v) => new Intl.NumberFormat("en-US").format(v)}
          color="lavender"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-base font-bold text-neutral-950">
              Top products by revenue
            </h2>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 hover:text-terracotta-500"
            >
              Orders
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          {productsByRevenue.length === 0 ? (
            <p className="px-5 py-6 text-sm text-neutral-500">
              No paid orders yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 text-right font-semibold">Orders</th>
                    <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {productsByRevenue.map((product) => (
                    <tr key={product.productId} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 font-medium text-neutral-950">
                        {product.title}
                      </td>
                      <td className="px-5 py-3">
                        <Badge>{statusLabel(product.type)}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-neutral-600">
                        {product.orders}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-neutral-950">
                        {formatPrice(product.revenueMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
          <h2 className="text-base font-bold text-neutral-950">
            Orders by status
          </h2>
          {ordersByStatus.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No orders yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {ordersByStatus.map((row) => {
                const pct =
                  totalStatuses > 0
                    ? Math.round((row.count / totalStatuses) * 100)
                    : 0;
                return (
                  <li key={row.status}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-neutral-700">
                        {statusLabel(row.status)}
                      </span>
                      <span className="font-semibold text-neutral-950">
                        {row.count}
                        <span className="ml-1 text-xs font-normal text-neutral-500">
                          {pct}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-terracotta-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 rounded-[12px] bg-neutral-100 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
              <Clock4 aria-hidden="true" className="h-4 w-4 text-terracotta-600" />
              Upcoming sessions
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-950">
              {operations.upcomingBookings}
            </p>
            <p className="text-xs text-neutral-500">
              confirmed and pending sessions on the calendar
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-base font-bold text-neutral-950">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 hover:text-terracotta-500"
          >
            View all
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        {recentOrders.rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-500">No orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Item</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentOrders.rows.map((order) => {
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
                        <Badge tone={statusTone(order.status)}>
                          {statusLabel(order.status)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-base font-bold text-neutral-950">
            Recent enrollments
          </h2>
          <Link
            href="/admin/enrollees"
            className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-600 hover:text-terracotta-500"
          >
            All enrollees
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        {recentEnrollments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-500">
            No enrollments yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Course</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Reference</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentEnrollments.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 font-medium text-neutral-950">
                      {row.courseTitle}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {row.customerEmail}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {row.orderReference}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={enrollmentTone(row.status)}>
                        {statusLabel(row.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {row.fulfilledAt ? formatDate(row.fulfilledAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}