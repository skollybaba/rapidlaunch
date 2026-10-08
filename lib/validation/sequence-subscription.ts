import { z } from 'zod';

export const subscribeToSequenceSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  name: z.string().trim().max(200).optional(),
  sequenceId: z.string().trim().min(1),
  productId: z.string().trim().min(1).optional(),
  userId: z.string().trim().optional(),
});
