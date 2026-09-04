import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import { dbConnect } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { AuthServiceError } from "@/lib/services/auth-service";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validation/account";
import User from "@/models/User";
import type { PublicUser } from "@/types/user";

export class ProfileServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ProfileServiceError";
    this.code = code;
    this.status = status;
  }
}

async function requireAuthedUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ProfileServiceError("UNAUTHENTICATED", "You must be signed in.", 401);
  }
  return String(user._id);
}

export async function updateOwnProfile(input: unknown): Promise<PublicUser> {
  const parsed = updateProfileSchema.parse(input);
  const userId = await requireAuthedUserId();
  await dbConnect();

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { name: parsed.name } },
    { new: true }
  )
    .select("_id email name role")
    .lean()
    .exec();

  if (!updated) {
    throw new ProfileServiceError("NOT_FOUND", "Account not found.", 404);
  }

  return {
    id: String(updated._id),
    email: updated.email,
    name: updated.name,
    role: updated.role,
  };
}

export async function changeOwnPassword(input: unknown): Promise<void> {
  const parsed = changePasswordSchema.parse(input);
  const userId = await requireAuthedUserId();
  await dbConnect();

  const user = await User.findById(userId).select("_id passwordHash provider").lean().exec();
  if (!user) {
    throw new ProfileServiceError("NOT_FOUND", "Account not found.", 404);
  }

  if (user.provider === "google" && !user.passwordHash) {
    throw new ProfileServiceError(
      "NO_PASSWORD_SET",
      "This account uses Google sign-in and has no password. Use password reset to set one.",
      400
    );
  }

  const valid = user.passwordHash
    ? await verifyPassword(parsed.currentPassword, user.passwordHash)
    : false;
  if (!valid) {
    throw new ProfileServiceError(
      "INVALID_CURRENT_PASSWORD",
      "Your current password is incorrect.",
      401
    );
  }

  const passwordHash = await hashPassword(parsed.newPassword);
  await User.updateOne({ _id: user._id }, { $set: { passwordHash } });
}

// Re-exported for convenience when clients only need the auth error shape.
export { AuthServiceError };
