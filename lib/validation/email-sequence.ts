import { z } from 'zod';

export const emailSequenceStepSchema = z.object({
  index: z.number().int().min(0),
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject too long'),
  title: z.string().trim().optional().or(z.literal('')),
  body: z.string().min(1, 'Body is required'),
  delayHours: z.number().int().min(0).max(8760),
});

export const createEmailSequenceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  productId: z.string().trim().min(1, 'Product is required'),
  totalSteps: z.number().int().min(1).max(50),
  intervalValue: z.number().int().min(1).max(3650),
  intervalUnit: z.enum(['hours', 'days']),
  steps: z.array(emailSequenceStepSchema).min(1, 'At least one step is required'),
});

export const updateEmailSequenceSchema = createEmailSequenceSchema.partial().extend({
  active: z.boolean().optional(),
});

export const sequenceQuerySchema = z.object({
  productId: z.string().trim().optional(),
  active: z.string().trim().optional(),
});
