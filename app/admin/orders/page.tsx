import type { Metadata } from "next";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import {
  getAdminOrders,
  type AdminOrderRow,
} from "@/lib/services/admin-service";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDateTime, formatPrice } from "@/lib/utils";
import { ORDER_STATUSES } from "@/types/order";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orders | Back office | Rapid Launch",
};

interface OrdersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function parseParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function pageHref(
  page: number,
  q: string,
  status: string
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/orders${qs ? `?${qs}` : ""}`;
}

function statusTone(status: string): string {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "pending";
    case "FAILED":
    case "CANCELLED":
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "error";
    default:
      return "neutral";
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase();
}

export default async function AdminOrdersPage({
  searchParams,
}: OrdersPageProps) {
  await requireAdmin();

  const sp = await searchParams;
  const q = parseParam(sp?.q);
  const status = parseParam(sp?.status);
  const page = Math.max(1, Number(parseParam(sp?.page)) || 1);

  const data = await getAdminOrders({ q, status, page, pageSize: 25 });

  return (
    <div className="flex flex-1 flex-col">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          Back office
        </p>
        <h1 className="mt-1 text-[1.75rem] leading-[1.286]">Orders</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {data.total} order{data.total === 1 ? "" : "s"}
        </p>
      </div>

      <form
        method="GET"
        action="/admin/orders"
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <label
          htmlFor="order-search"
          className="sr-only"
        >
          Search by order reference or email
        </label>
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            id="order-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search order ref or email"
            className="h-11 w-full rounded-[10px] border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-terracotta-600 focus:outline-none focus:ring-2 focus:ring-terracotta-600/20"
          />
        </div>

        <label htmlFor="order-status" className="sr-only">
          Filter by status
        </label>
        <select
          id="order-status"
          name="status"
          defaultValue={status}
          className="h-11 rounded-[10px] border border-neutral-300 bg-white px-3 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none focus:ring-2 focus:ring-terracotta-600/20"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className={buttonStyles({ variant: "primary", className: "h-11" })}
        >
          Apply
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
        {data.rows.length === 0 ? (
          <EmptyState
            title="No orders found"
            description={
              q || status
                ? "Try adjusting your search or status filter."
                : "Orders will appear here once customers complete a checkout."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-[0.08em] text-neutral-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Order
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    date
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
                    Payment
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {data.rows.map((order: AdminOrderRow) => {
                  const tone = statusTone(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 font-medium text-neutral-950">
                        {order.orderReference}
                      </td>
                      <td className="px-5 py-3 text-neutral-500">
                        {order.createdAt
                          ? formatDateTime(order.createdAt, { year: "numeric" })
                          : "\u2014"}
                      </td>
                      <td className="px-5 py-3 max-w-[200px]">
                        <p className="truncate font-medium text-neutral-950">
                          {order.customerName || order.customerEmail}
                        </p>
                        <p className="truncate text-xs text-neutral-400">
                          {order.customerEmail}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-neutral-600">
                        {order.itemTitle}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-neutral-950">
                        {formatPrice(order.totalMinor, order.currency)}
                      </td>
                      <td className="px-5 py-3 text-neutral-500">
                        {order.paymentStatus
                          ? statusLabel(order.paymentStatus)
                          : "\u2014"}
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

      {data.totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <a
                href={pageHref(data.page - 1, q, status)}
                className={buttonStyles({ variant: "secondary" })}
              >
                Previous
              </a>
            ) : null}
            {data.page < data.totalPages ? (
              <a
                href={pageHref(data.page + 1, q, status)}
                className={buttonStyles({ variant: "secondary" })}
              >
                Next
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
