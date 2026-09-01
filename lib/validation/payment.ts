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