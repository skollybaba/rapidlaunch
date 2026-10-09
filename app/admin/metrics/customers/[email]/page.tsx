import "server-only";

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getCustomerDetail } from "@/lib/services/metrics-service";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getDetailData(params: Promise<{ email: string }>) {
  const { email } = await params;
  return getCustomerDetail(decodeURIComponent(email));
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ email: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center">Access denied</div>;
  }

  const data = await getDetailData(params);
  const { email, totalSpentMinor, paidOrders, allOrders, firstPaidAt, lastPaidAt, discountedOrders, orders } = data;
  const format = (v: number) => formatPrice(v, "NGN");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/metrics/customers"
            className="text-terracotta-600 hover:underline text-sm font-medium"
          >
            &larr; Back to customers
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Customer detail</h1>
          <p className="text-neutral-500 mt-1">{email}</p>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total spent" value={format(totalSpentMinor)} />
        <KpiCard label="Paid orders" value={paidOrders.toString()} />
        <KpiCard label="All orders" value={allOrders.toString()} />
        <KpiCard label="Discounted orders" value={discountedOrders.toString()} />
      </div>

      {firstPaidAt && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <p className="text-sm text-neutral-500">First purchase</p>
            <p className="mt-1 text-lg font-semibold text-neutral-950">{new Date(firstPaidAt).toLocaleDateString()}</p>
          </div>
          <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
            <p className="text-sm text-neutral-500">Last purchase</p>
            <p className="mt-1 text-lg font-semibold text-neutral-950">{new Date(lastPaidAt!).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-500">Order history</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium text-right">Subtotal</th>
                <th className="pb-2 font-medium text-right">Discount</th>
                <th className="pb-2 font-medium text-right">Total</th>
                <th className="pb-2 font-medium">Coupon</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-terracotta-600 hover:underline"
                    >
                      {o.orderReference}
                    </Link>
                  </td>
                  <td className="py-3">
                    <span className="font-medium text-neutral-900">{o.itemTitle}</span>
                    {o.itemType && <span className="ml-2 text-xs text-neutral-500">{o.itemType}</span>}
                  </td>
                  <td className="py-3 text-right text-neutral-900">{format(o.subtotalMinor)}</td>
                  <td className="py-3 text-right text-red-600">
                    {o.discountMinor > 0 ? `-${format(o.discountMinor)}` : "—"}
                  </td>
                  <td className="py-3 text-right font-semibold text-neutral-900">{format(o.totalMinor)} {o.currency}</td>
                  <td className="py-3 text-neutral-500">{o.couponCode ?? "—"}</td>
                  <td className="py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-3 text-neutral-500">
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}
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

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-700",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-neutral-100 text-neutral-700",
    REFUNDED: "bg-blue-100 text-blue-700",
    PARTIALLY_REFUNDED: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-neutral-100 text-neutral-700"}`}>
      {status}
    </span>
  );
}