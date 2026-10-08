import Link from "next/link";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { CouponToggle } from "@/components/admin/coupon-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getAdminCoupons,
  type AdminCouponQuery,
} from "@/lib/services/coupon-service";
import { formatDateTime } from "@/lib/utils";
import type { CouponStatus } from "@/types/coupon";

const STATUS_TONES: Record<CouponStatus, BadgeTone> = {
  ACTIVE: "success",
  OFF: "neutral",
  SCHEDULED: "pending",
  EXPIRED: "neutral",
  EXHAUSTED: "error",
};

interface CouponListViewProps {
  q?: string;
  status?: string;
}

export async function CouponListView({ q = "", status = "" }: CouponListViewProps) {
  const query: AdminCouponQuery = { q };
  if (
    status === "ACTIVE" ||
    status === "OFF" ||
    status === "SCHEDULED" ||
    status === "EXPIRED" ||
    status === "EXHAUSTED"
  ) {
    query.status = status;
  }
  const rows = await getAdminCoupons(query);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Discount codes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Percentage coupons customers enter at checkout.
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="rounded-pill bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terracotta-500"
        >
          New coupon
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by code"
            className="w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
        <div>
          <select
            name="status"
            defaultValue={status}
            className="h-[42px] rounded-[12px] border border-neutral-300 bg-white px-3 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="OFF">Inactive</option>
            <option value="SCHEDULED">Not started</option>
            <option value="EXPIRED">Expired</option>
            <option value="EXHAUSTED">Used up</option>
          </select>
        </div>
        <button
          type="submit"
          className="h-[42px] rounded-pill bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No coupons yet"
          description="Create your first discount code so customers can save at checkout."
          action={
            <Link
              href="/admin/coupons/new"
              className="rounded-pill bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              New coupon
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Discount</th>
                  <th className="px-5 py-3 font-semibold">Applies to</th>
                  <th className="px-5 py-3 font-semibold">Usage</th>
                  <th className="px-5 py-3 font-semibold">Ends</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">On</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/coupons/${row.id}`}
                        className="font-mono font-semibold text-terracotta-600 hover:underline"
                      >
                        {row.code}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {row.discountPercent}% off
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {row.appliesToLabel}
                    </td>
                    <td className="px-5 py-4 text-neutral-700">{row.usage}</td>
                    <td className="px-5 py-4 text-neutral-700">
                      {row.endsAt ? formatDateTime(row.endsAt) : "Never"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS_TONES[row.status]}>
                        {row.statusLabel}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <CouponToggle
                        id={row.id}
                        active={row.active}
                        code={row.code}
                        disabled={row.status === "EXHAUSTED"}
                      />
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {formatDateTime(row.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}