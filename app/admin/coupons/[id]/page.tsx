import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CouponForm } from "@/components/admin/coupon-form";
import { requireAdmin } from "@/lib/auth/admin";
import { getCouponById } from "@/lib/services/coupon-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit discount code | Rapid Launch Back office",
};

export default async function AdminEditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const coupon = await getCouponById(id);
  if (!coupon) notFound();

  const initial = {
    id: String(coupon._id),
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    appliesTo: coupon.appliesTo,
    active: coupon.active,
    startsAt: coupon.startsAt ? coupon.startsAt.toISOString() : null,
    endsAt: coupon.endsAt ? coupon.endsAt.toISOString() : null,
    maxUses: coupon.maxUses ?? null,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500">
          <Link href="/admin/coupons" className="hover:underline">
            Discount codes
          </Link>{" "}
          / Edit
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-950">
          {coupon.code}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {coupon.discountPercent}% off · {coupon.usedCount} redeemed
        </p>
      </div>
      <CouponForm initial={initial} />
    </div>
  );
}