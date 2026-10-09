import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ReceiptText,
  ShoppingCart,
  Tag,
  Wallet,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/admin";
import { getCustomerDetail } from "@/lib/services/metrics-service";
import { formatPrice } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/admin/metrics/section-card";
import { StatCard } from "@/components/admin/metrics/stat-card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ email: string }>;
}): Promise<Metadata> {
  const { email } = await params;
  return { title: `${decodeURIComponent(email)} | Rapid Launch` };
}

function statusTone(status: string): BadgeTone {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "pending";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "info";
    case "FAILED":
    case "CANCELLED":
      return "error";
    default:
      return "neutral";
  }
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  await requireAdmin();

  const { email: emailParam } = await params;
  const data = await getCustomerDetail(decodeURIComponent(emailParam));
  const {
    email,
    totalSpentMinor,
    paidOrders,
    allOrders,
    firstPaidAt,
    lastPaidAt,
    discountedOrders,
    orders,
  } = data;

  const format = (v: number) => formatPrice(v, "NGN");

  return (
    <div className="admin-enter flex flex-1 flex-col">
      <header className="flex flex-col gap-5">
        <Link
          href="/admin/metrics/customers"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-terracotta-600 hover:text-terracotta-500"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to customers
        </Link>

        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-xl font-bold uppercase text-terracotta-600"
          >
            {email.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
              Customer
            </p>
            <h1 className="mt-0.5 truncate text-[28px] leading-tight md:text-[1.75rem]">
              {email}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {paidOrders} paid order{paidOrders === 1 ? "" : "s"} ·{" "}
              {allOrders} total
              {firstPaidAt
                ? ` · customer since ${new Date(firstPaidAt).toLocaleDateString()}`
                : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total spent"
          value={format(totalSpentMinor)}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Paid orders"
          value={paidOrders.toLocaleString()}
          icon={ShoppingCart}
        />
        <StatCard
          label="All orders"
          value={allOrders.toLocaleString()}
          icon={ReceiptText}
          tone="info"
        />
        <StatCard
          label="Discounted orders"
          value={discountedOrders.toLocaleString()}
          icon={Tag}
          tone="warning"
        />
      </div>

      {firstPaidAt ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SectionCard title="First purchase" subtitle="Lifetime start">
            <p className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-950">
              <CalendarDays
                aria-hidden="true"
                className="h-5 w-5 text-terracotta-600"
              />
              {new Date(firstPaidAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </SectionCard>
          <SectionCard title="Last purchase" subtitle="Most recent activity">
            <p className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-950">
              <CalendarDays
                aria-hidden="true"
                className="h-5 w-5 text-terracotta-600"
              />
              {lastPaidAt
                ? new Date(lastPaidAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </SectionCard>
        </div>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
        <div className="px-5 pt-5">
          <h2 className="text-base font-bold text-neutral-950">Order history</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Every order placed by this customer
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No orders yet"
              description="This customer has not placed any orders."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Subtotal
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Discount
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Coupon</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 font-medium text-terracotta-600 hover:text-terracotta-500"
                      >
                        {order.orderReference}
                        <ArrowUpRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-neutral-900">
                        {order.itemTitle}
                      </span>
                      {order.itemType ? (
                        <span className="ml-2 text-xs text-neutral-500">
                          {order.itemType.toLowerCase()}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-700">
                      {format(order.subtotalMinor)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-danger-600">
                      {order.discountMinor > 0
                        ? `−${format(order.discountMinor)}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-neutral-950">
                      {format(order.totalMinor)}
                    </td>
                    <td className="px-5 py-3">
                      {order.couponCode ? (
                        <span className="rounded-[6px] bg-lavender-100 px-2 py-0.5 font-mono text-xs font-semibold text-ink-700">
                          {order.couponCode}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(order.status)}>
                        {order.status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-neutral-500">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString()
                        : "—"}
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
