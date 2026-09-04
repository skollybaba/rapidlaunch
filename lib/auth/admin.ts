import "server-only";

import { notFound } from "next/navigation";

import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import type { UserRole } from "@/types/user";

const ADMIN_EMAILS = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function adminEmails(): string[] {
  return [...ADMIN_EMAILS];
}

interface GuardOptions {
  /**
   * When true (default), unauthorized users are rejected via `notFound()`
   * which stops rendering the protected content. API route handlers should
   * pass `reject: false` and handle the returned null themselves.
   */
  reject?: boolean;
}

/**
 * Server-side authorization guard for admin-only pages. Returns the current
 * user when authorized, otherwise `notFound()` is thrown which its the
 * protected content from rendering.
 */
export async function requireAdmin(options: GuardOptions = {}): Promise<
  NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
> {
  const user = await requireRole(["admin"], options);
  return user!;
}

/**
 * Server-side authorization guard for protected areas. Returns the current
 * user when authorized, otherwise `notFound()` is thrown (when `reject: true`)
 * which stops rendering. API route handlers may pass `reject: false` and
 * handle the returned null themselves.
 */
export async function requireRole(
  roles: UserRole[],
  options: GuardOptions = {}
): Promise<Awaited<ReturnType<typeof getCurrentUser>> | null> {
  const rejectOnFail = options.reject ?? true;
  const user = await getCurrentUser();

  const allowed = user ? roles.includes(user.role) : false;

  if (allowed) return user;

  if (rejectOnFail) {
    notFound();
  }

  return user;
}
