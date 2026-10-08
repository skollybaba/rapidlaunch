import { z } from "zod";

export const sessionDetailsSchema = z
  .object({
    customerName: z.string().trim().min(1, "Please enter your full name").max(120),
    whatYouAreBuilding: z
      .string()
      .trim()
      .min(1, "Please tell us a bit about what you're building")
      .max(400),
    currentStage: z.string().trim().max(60).optional(),
    helpNeeded: z
      .string()
      .trim()
      .min(1, "Please let us know what you'd like help with")
      .max(1000),
    timezone: z.string().trim().max(80).optional(),
    requestedStartTime: z.string().datetime().optional(),
  })
  .strict()
  .optional();

export const createCheckoutSessionSchema = z
  .object({
    productId: z.string().min(1, "Please select a product"),
    customerEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address"),
    couponCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/, "Invalid discount code")
      .optional(),
    session: sessionDetailsSchema,
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type CreateCheckoutSessionInput = z.infer<
  typeof createCheckoutSessionSchema
>;

export const initializePaymentSchema = z
  .object({
    orderReference: z.string().min(1, "orderReference is required"),
  })
  .strict();

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;

export const orderReferenceSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Z0-9_-]+$/, "Invalid order reference");