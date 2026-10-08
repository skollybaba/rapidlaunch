import { z } from "zod";

import { COUPON_APPLIES_TO } from "@/types/coupon";

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z0-9][A-Z0-9-]{1,39}$/,
        "Code may only contain uppercase letters, numbers, and hyphens"
      ),
    discountPercent: z
      .number()
      .int()
      .min(1, "Discount must be at least 1%")
      .max(99, "Discount cannot be 100%"),
    appliesTo: z.enum(COUPON_APPLIES_TO).default("ALL"),
    active: z.boolean().default(false),
    startsAt: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional()
      .transform((v) => (v ? new Date(v) : null)),
    endsAt: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional()
      .transform((v) => (v ? new Date(v) : null)),
    maxUses: z
      .number()
      .int()
      .min(1, "Usage limit must be at least 1")
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["endsAt"],
      });
    }
  });

export type CouponInput = z.infer<typeof couponInputSchema>;

export const couponToggleSchema = z
  .object({ active: z.boolean() })
  .strict();

export const couponPreviewSchema = z
  .object({
    couponCode: z
      .string()
      .trim()
      .min(1, "Discount code is required")
      .toUpperCase(),
    productId: z.string().min(1, "Product is required"),
  })
  .strict();

export type CouponPreviewInput = z.infer<typeof couponPreviewSchema>;

export const adminCouponQuerySchema = z
  .object({
    q: z.string().trim().optional(),
    status: z.enum(["ACTIVE", "OFF", "SCHEDULED", "EXPIRED", "EXHAUSTED"]).optional(),
  })
  .strict();