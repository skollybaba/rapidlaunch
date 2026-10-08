import type { ProductType } from "@/types/product";

export const COUPON_APPLIES_TO = [
  "ALL",
  ...(["COURSE", "BOOK", "CONSULTATION", "MVP_SERVICE"] as const satisfies readonly ProductType[]),
] as const;

export type CouponAppliesTo = (typeof COUPON_APPLIES_TO)[number];

export const COUPON_STATUSES = [
  "ACTIVE",
  "OFF",
  "SCHEDULED",
  "EXPIRED",
  "EXHAUSTED",
] as const;

export type CouponStatus = (typeof COUPON_STATUSES)[number];

export const COUPON_APPLIES_TO_LABELS: Record<CouponAppliesTo, string> = {
  ALL: "All products",
  COURSE: "Courses",
  BOOK: "Books",
  CONSULTATION: "Booking sessions",
  MVP_SERVICE: "MVP services",
};

export interface CouponRedemption {
  email: string;
  orderReference: string;
  usedAt: Date;
}

export interface CouponDoc {
  _id: unknown;
  code: string;
  discountPercent: number;
  appliesTo: CouponAppliesTo;
  active: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  maxUses?: number | null;
  usedCount: number;
  redemptions: CouponRedemption[];
  createdAt?: Date;
  updatedAt?: Date;
}

export function couponAppliesToProduct(
  appliesTo: CouponAppliesTo,
  productType: ProductType
): boolean {
  return appliesTo === "ALL" || appliesTo === productType;
}

export function couponStatus(
  coupon: Pick<
    CouponDoc,
    "active" | "startsAt" | "endsAt" | "maxUses" | "usedCount"
  >,
  now: Date = new Date()
): CouponStatus {
  if (!coupon.active) return "OFF";
  if (
    coupon.maxUses != null &&
    coupon.maxUses > 0 &&
    coupon.usedCount >= coupon.maxUses
  ) {
    return "EXHAUSTED";
  }
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return "SCHEDULED";
  if (coupon.endsAt && new Date(coupon.endsAt) < now) return "EXPIRED";
  return "ACTIVE";
}

export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = {
  ACTIVE: "Active",
  OFF: "Inactive",
  SCHEDULED: "Not started",
  EXPIRED: "Expired",
  EXHAUSTED: "Used up",
};