import type { Metadata } from "next";
import Link from "next/link";

import { CouponForm } from "@/components/admin/coupon-form";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New discount code | Rapid Launch Back office",
};

export default async function AdminNewCouponPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500">
          <Link href="/admin/coupons" className="hover:underline">
            Discount codes
          </Link>{" "}
          / New
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-950">
          New discount code
        </h1>
      </div>
      <CouponForm />
    </div>
  );
}