import { z } from "zod";

import { USER_ROLES } from "@/types/user";

export const updateUserRoleSchema = z
  .object({
    role: z.enum(USER_ROLES),
  })
  .strict();

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
