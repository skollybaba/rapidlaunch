import { z } from "zod";

export const createCheckoutSessionSchema = z
  .object({
    productId: z.string().min(1, "productId is required"),
    customerEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("A valid email is required"),
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