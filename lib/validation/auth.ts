import { z } from "zod";

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined)),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("A valid email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("A valid email is required"),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("A valid email is required"),
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
  })
  .strict();

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
