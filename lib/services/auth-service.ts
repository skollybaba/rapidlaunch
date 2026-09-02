import "server-only";

import {
  signPasswordResetToken,
  verifyPasswordResetToken,
} from "@/lib/auth/tokens";
import { clearSessionCookie, createSessionCookie, toPublicUser } from "@/lib/auth/session";
import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createMailAdapter } from "@/lib/providers/mail";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import User from "@/models/User";
import type { PublicUser } from "@/types/user";

export class AuthServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
    this.status = status;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(input: unknown): Promise<PublicUser> {
  const parsed = registerSchema.parse(input);
  await dbConnect();

  const email = normalizeEmail(parsed.email);
  const existing = await User.findOne({ email }).select("_id").lean().exec();
  if (existing) {
    throw new AuthServiceError(
      "EMAIL_IN_USE",
      "An account with this email already exists. Try signing in.",
      409
    );
  }

  const passwordHash = await hashPassword(parsed.password);
  const user = await User.create({
    email,
    name: parsed.name,
    passwordHash,
    role: "customer",
  });

  await createSessionCookie(user);

  const mail = createMailAdapter();
  try {
    await mail.sendTemplateEmail({
      templateKey: "account_welcome",
      to: email,
      variables: {
        name: parsed.name || "there",
        appUrl: env.NEXT_PUBLIC_APP_URL,
      },
    });
  } catch {
    // welcome email is best-effort; registration still succeeds
  }

  return toPublicUser({
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export async function loginUser(input: unknown): Promise<PublicUser> {
  const parsed = loginSchema.parse(input);
  await dbConnect();

  const email = normalizeEmail(parsed.email);
  const user = await User.findOne({ email }).lean().exec();
  if (!user || !user.passwordHash) {
    throw new AuthServiceError(
      "INVALID_CREDENTIALS",
      "Incorrect email or password.",
      401
    );
  }

  const valid = await verifyPassword(parsed.password, user.passwordHash);
  if (!valid) {
    throw new AuthServiceError(
      "INVALID_CREDENTIALS",
      "Incorrect email or password.",
      401
    );
  }

  await createSessionCookie(user);

  return toPublicUser({
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export async function logoutUser(): Promise<void> {
  await clearSessionCookie();
}

export async function requestPasswordReset(input: unknown): Promise<void> {
  const parsed = forgotPasswordSchema.parse(input);
  await dbConnect();

  const email = normalizeEmail(parsed.email);
  const user = await User.findOne({ email }).select("_id email name").lean().exec();

  // Always report success to avoid leaking which emails exist.
  if (!user) return;

  const token = await signPasswordResetToken(String(user._id));
  const mail = createMailAdapter();
  try {
    await mail.sendTemplateEmail({
      templateKey: "password_reset",
      to: email,
      variables: {
        name: user.name || "there",
        resetUrl: `${env.NEXT_PUBLIC_APP_URL}/account/reset-password?token=${encodeURIComponent(token)}`,
        appUrl: env.NEXT_PUBLIC_APP_URL,
      },
    });
  } catch {
    throw new AuthServiceError(
      "RESET_EMAIL_FAILED",
      "We could not send the reset email. Please try again.",
      502
    );
  }
}

export async function resetPassword(input: unknown): Promise<void> {
  const parsed = resetPasswordSchema.parse(input);

  const userId = await verifyPasswordResetToken(parsed.token);
  if (!userId) {
    throw new AuthServiceError(
      "INVALID_RESET_TOKEN",
      "This reset link is invalid or has expired. Request a new one.",
      400
    );
  }

  await dbConnect();
  const user = await User.findById(userId).select("_id").lean().exec();
  if (!user) {
    throw new AuthServiceError(
      "INVALID_RESET_TOKEN",
      "This reset link is invalid or has expired. Request a new one.",
      400
    );
  }

  const passwordHash = await hashPassword(parsed.password);
  await User.updateOne({ _id: user._id }, { $set: { passwordHash } });

  // Invalidate existing sessions by rotating secret is not practical here;
  // the user will sign in again with the new password.
}
