import "server-only";

import { dbConnect } from "@/lib/db";
import { Coupon } from "@/models/Coupon";
import {
  adminCouponQuerySchema,
  couponInputSchema,
} from "@/lib/validation/coupon";
import {
  COUPON_APPLIES_TO_LABELS,
  COUPON_STATUS_LABELS,
  couponAppliesToProduct,
  couponStatus,
  type CouponAppliesTo,
  type CouponRedemption,
  type CouponStatus,
} from "@/types/coupon";
import type { ProductType } from "@/types/product";

export class CouponServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "CouponServiceError";
    this.code = code;
    this.status = status;
  }
}

export interface AdminCouponRow {
  id: string;
  code: string;
  discountPercent: number;
  appliesTo: CouponAppliesTo;
  appliesToLabel: string;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number | null;
  usedCount: number;
  usage: string;
  status: CouponStatus;
  statusLabel: string;
  updatedAt: string;
}

export interface AdminCouponQuery {
  q?: string;
  status?: CouponStatus;
}

export interface AppliedCoupon {
  couponId: string;
  code: string;
  discountPercent: number;
  discountMinor: number;
  subtotalMinor: number;
  totalMinor: number;
}

export interface CouponPreview {
  code: string;
  discountPercent: number;
  appliesTo: CouponAppliesTo;
  discountMinor: number;
  subtotalMinor: number;
  totalMinor: number;
}

interface LeanCouponDoc {
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
}

function asFindFilter(filter: Record<string, unknown>) {
  return filter as unknown as Parameters<typeof Coupon.find>[0];
}

function asFindOneFilter(filter: Record<string, unknown>) {
  return filter as unknown as Parameters<typeof Coupon.findOne>[0];
}

function asUpdateOneFilter(filter: Record<string, unknown>) {
  return filter as unknown as Parameters<typeof Coupon.updateOne>[0];
}

function appliesToLabel(value: CouponAppliesTo): string {
  return COUPON_APPLIES_TO_LABELS[value];
}

function usageLabel(row: { usedCount: number; maxUses?: number | null }): string {
  if (row.maxUses == null) return `${row.usedCount} used`;
  return `${row.usedCount} / ${row.maxUses}`;
}

export async function getAdminCoupons(
  query: AdminCouponQuery = {}
): Promise<AdminCouponRow[]> {
  await dbConnect();

  const parsed = adminCouponQuerySchema.parse(query);

  const filter: Record<string, unknown> = {};
  const trimmed = parsed.q?.trim();
  if (trimmed) {
    filter.$or = [
      { code: { $regex: trimmed.toUpperCase(), $options: "i" } },
    ];
  }

  const docs = await Coupon.find(asFindFilter(filter))
    .sort({ createdAt: -1 })
    .select(
      "_id code discountPercent appliesTo active startsAt endsAt maxUses usedCount redemptions updatedAt"
    )
    .lean()
    .exec();

  let rows = docs.map((d) => {
    const status = couponStatus(d);
    return {
      id: String(d._id),
      code: d.code,
      discountPercent: d.discountPercent,
      appliesTo: d.appliesTo,
      appliesToLabel: appliesToLabel(d.appliesTo),
      active: d.active,
      startsAt: d.startsAt ? d.startsAt.toISOString() : null,
      endsAt: d.endsAt ? d.endsAt.toISOString() : null,
      maxUses: d.maxUses ?? null,
      usedCount: d.usedCount,
      usage: usageLabel(d),
      status,
      statusLabel: COUPON_STATUS_LABELS[status],
      updatedAt: (d.updatedAt ?? new Date()).toISOString(),
    } satisfies AdminCouponRow;
  });

  if (parsed.status) {
    rows = rows.filter((r) => r.status === parsed.status);
  }

  return rows;
}

export async function getCouponById(id: string) {
  await dbConnect();
  return Coupon.findById(id).lean().exec();
}

export async function createCoupon(input: unknown) {
  const parsed = couponInputSchema.parse(input);
  await dbConnect();
  const existing = await Coupon.findOne(asFindOneFilter({ code: parsed.code }))
    .select("_id")
    .lean()
    .exec();
  if (existing) {
    throw new CouponServiceError("COUPON_CODE_IN_USE", "A coupon with this code already exists.", 409);
  }
  const created = await Coupon.create({
    ...parsed,
    maxUses: parsed.maxUses ?? null,
  });
  return created;
}

export async function updateCoupon(id: string, input: unknown) {
  const parsed = couponInputSchema.parse(input);
  await dbConnect();
  const codeExists = await Coupon.findOne(
    asFindOneFilter({ code: parsed.code, _id: { $ne: id } })
  )
    .select("_id")
    .lean()
    .exec();
  if (codeExists) {
    throw new CouponServiceError("COUPON_CODE_IN_USE", "A coupon with this code already exists.", 409);
  }
  const updated = await Coupon.findByIdAndUpdate(
    id,
    { $set: { ...parsed, maxUses: parsed.maxUses ?? null } },
    { new: true }
  )
    .select("_id code discountPercent appliesTo active")
    .lean()
    .exec();
  if (!updated) {
    throw new CouponServiceError("COUPON_NOT_FOUND", "Coupon not found.", 404);
  }
  return updated;
}

export async function setCouponActive(id: string, active: boolean): Promise<void> {
  await dbConnect();
  const updated = await Coupon.findByIdAndUpdate(id, { $set: { active } }, { new: true })
    .select("_id")
    .lean()
    .exec();
  if (!updated) {
    throw new CouponServiceError("COUPON_NOT_FOUND", "Coupon not found.", 404);
  }
}

export async function deleteCoupon(id: string): Promise<void> {
  await dbConnect();
  const result = await Coupon.findByIdAndDelete(id).exec();
  if (!result) {
    throw new CouponServiceError("COUPON_NOT_FOUND", "Coupon not found.", 404);
  }
}

async function loadCouponForApply(code: string): Promise<LeanCouponDoc | null> {
  const doc = await Coupon.findOne(asFindOneFilter({ code })).lean().exec();
  if (!doc) return null;
  return {
    _id: doc._id,
    code: doc.code,
    discountPercent: doc.discountPercent,
    appliesTo: doc.appliesTo,
    active: doc.active,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt,
    maxUses: doc.maxUses,
    usedCount: doc.usedCount,
    redemptions: doc.redemptions,
  };
}

function assertCouponUsable(
  coupon: LeanCouponDoc,
  productType: ProductType
): void {
  switch (couponStatus(coupon)) {
    case "OFF":
      throw new CouponServiceError("COUPON_INACTIVE", "This discount code is not currently active.", 400);
    case "SCHEDULED":
      throw new CouponServiceError("COUPON_NOT_YET_ACTIVE", "This discount code is not active yet.", 400);
    case "EXPIRED":
      throw new CouponServiceError("COUPON_EXPIRED", "This discount code has expired.", 400);
    case "EXHAUSTED":
      throw new CouponServiceError("COUPON_LIMIT_REACHED", "This discount code has reached its usage limit.", 400);
    case "ACTIVE":
      break;
  }

  if (!couponAppliesToProduct(coupon.appliesTo, productType)) {
    throw new CouponServiceError("COUPON_NOT_APPLICABLE", "This discount code does not apply to this product.", 400);
  }
}

export async function getCouponPreview(
  code: string,
  productType: ProductType,
  subtotalMinor: number
): Promise<CouponPreview> {
  await dbConnect();
  const coupon = await loadCouponForApply(code);
  if (!coupon) {
    throw new CouponServiceError("COUPON_NOT_FOUND", "This discount code does not exist. Check it and try again.", 404);
  }

  assertCouponUsable(coupon, productType);

  const discountMinor = Math.round((subtotalMinor * coupon.discountPercent) / 100);
  const totalMinor = subtotalMinor - discountMinor;
  if (totalMinor <= 0) {
    throw new CouponServiceError("COUPON_EXCEEDS_PRICE", "This discount would make the order free.", 400);
  }

  return {
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    appliesTo: coupon.appliesTo,
    discountMinor,
    subtotalMinor,
    totalMinor,
  };
}

export async function applyCouponToCheckout(input: {
  code: string;
  productType: ProductType;
  customerEmail: string;
  orderReference: string;
  subtotalMinor: number;
}): Promise<AppliedCoupon> {
  await dbConnect();
  const code = input.code.trim().toUpperCase();
  const customerEmail = input.customerEmail.trim().toLowerCase();
  const coupon = await loadCouponForApply(code);
  if (!coupon) {
    throw new CouponServiceError("COUPON_NOT_FOUND", "This discount code does not exist. Check it and try again.", 404);
  }

  assertCouponUsable(coupon, input.productType);

  const alreadyUsed = (coupon.redemptions ?? []).some(
    (r) => r.email === customerEmail
  );
  if (alreadyUsed) {
    throw new CouponServiceError("COUPON_ALREADY_USED", "This discount code has already been used for this email.", 409);
  }

  const discountMinor = Math.round((input.subtotalMinor * coupon.discountPercent) / 100);
  const totalMinor = input.subtotalMinor - discountMinor;
  if (totalMinor <= 0) {
    throw new CouponServiceError("COUPON_EXCEEDS_PRICE", "This discount would make the order free.", 400);
  }

  const reserved = await Coupon.findOneAndUpdate(
    asFindOneFilter({
      _id: coupon._id,
      usedCount: coupon.usedCount,
      "redemptions.email": { $ne: customerEmail },
    }),
    {
      $inc: { usedCount: 1 },
      $push: {
        redemptions: {
          email: customerEmail,
          orderReference: input.orderReference,
          usedAt: new Date(),
        },
      },
    },
    { new: true }
  )
    .select("_id")
    .lean()
    .exec();

  if (!reserved) {
    throw new CouponServiceError("COUPON_UNAVAILABLE", "This discount code was just used up. Please try again.", 409);
  }

  return {
    couponId: String(coupon._id),
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    discountMinor,
    subtotalMinor: input.subtotalMinor,
    totalMinor,
  };
}

export async function releaseCouponReservation(orderReference: string): Promise<void> {
  await dbConnect();
  await Coupon.updateOne(
    asUpdateOneFilter({
      "redemptions.orderReference": orderReference,
      usedCount: { $gt: 0 },
    }),
    {
      $inc: { usedCount: -1 },
      $pull: { redemptions: { orderReference } },
    }
  ).exec();
}