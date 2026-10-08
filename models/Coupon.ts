import { Schema, model, type Model } from "mongoose";

import {
  COUPON_APPLIES_TO,
  type CouponAppliesTo,
  type CouponDoc,
  type CouponRedemption,
} from "@/types/coupon";

const RedemptionSchema = new Schema<CouponRedemption>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    orderReference: { type: String, required: true },
    usedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const CouponSchema = new Schema<CouponDoc>(
  {
    code: {
      type: String,
      required: [true, "Code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9][A-Z0-9-]{1,39}$/, "Code may only contain uppercase letters, numbers, and hyphens"],
    },
    discountPercent: {
      type: Number,
      required: [true, "Discount is required"],
      min: [1, "Discount must be at least 1%"],
      max: [99, "Discount cannot be 100%"],
    },
    appliesTo: {
      type: String,
      enum: COUPON_APPLIES_TO,
      default: "ALL",
      index: true,
    },
    active: { type: Boolean, default: false, index: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    maxUses: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    redemptions: { type: [RedemptionSchema], default: [] },
  },
  { timestamps: true }
);

CouponSchema.index({ code: 1, createdAt: -1 });
CouponSchema.index({ active: 1, startsAt: 1, endsAt: 1 });

export const Coupon: Model<CouponDoc> = model<CouponDoc>(
  "Coupon",
  CouponSchema,
  undefined,
  { overwriteModels: true }
);

export type { CouponAppliesTo };

export default Coupon;