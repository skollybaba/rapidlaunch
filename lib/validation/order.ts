import { z } from "zod";

export const sessionDetailsSchema = z
  .object({
    customerName: z.string().trim().min(1, "Your name is required").max(120),
    whatYouAreBuilding: z
      .string()
      .trim()
      .min(1, "Tell us what you are building")
      .max(400),
    currentStage: z.string().trim().max(60).optional(),
    helpNeeded: z
      .string()
      .trim()
      .min(1, "Tell us what you need help with")
      .max(1000),
    timezone: z.string().trim().max(80).optional(),
    requestedStartTime: z.string().datetime().optional(),
  })
  .strict()
  .optional();

export const createCheckoutSessionSchema = z
  .object({
    productId: z.string().min(1, "productId is required"),
    customerEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("A valid email is required"),
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