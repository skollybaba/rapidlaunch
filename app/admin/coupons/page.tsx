import type { Metadata } from "next";

import { CouponListView } from "@/components/admin/coupon-list-view";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discount codes | Rapid Launch Back office",
};

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  return (
    <div className="admin-enter space-y-6">
      <CouponListView q={sp.q ?? ""} status={sp.status ?? ""} />
    </div>
  );
}