import { z } from "zod";

export const paystackChargeDataSchema = z.object({
  id: z.number().int().positive().optional(),
  reference: z.string().min(1),
  status: z.string().min(1),
  amount: z.number().int().min(0),
  currency: z.string().length(3),
  paid_at: z.string().optional(),
  created_at: z.string().optional(),
  channel: z.string().optional(),
  customer: z
    .object({
      email: z.string().email().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const paystackWebhookPayloadSchema = z.object({
  event: z.string().min(1),
  id: z.number().int().optional(),
  data: z.unknown(),
});

export type PaystackWebhookPayload = z.infer<
  typeof paystackWebhookPayloadSchema
>;

export type PaystackChargeData = z.infer<typeof paystackChargeDataSchema>;

/**
 * Bachs sends decimal-string amounts (`"2900.00"`), not integer minor units.
 * `charge_id` is nullable in the payload: test/legacy/manual collections may
 * omit it, so settlement keys off `checkout_id` or `reference` instead.
 */
export const bachsChargeDataSchema = z
  .object({
    checkout_id: z.string().optional(),
    reference: z.string().optional(),
    charge_id: z.string().nullable().optional(),
    status: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional(),
  })
  .passthrough();

export const bachsWebhookPayloadSchema = z
  .object({
    id: z.string().optional(),
    event: z.string().optional(),
    type: z.string().optional(),
    data: bachsChargeDataSchema.optional(),
  })
  .passthrough();

export type BachsWebhookPayload = z.infer<typeof bachsWebhookPayloadSchema>;
export type BachsChargeData = z.infer<typeof bachsChargeDataSchema>;