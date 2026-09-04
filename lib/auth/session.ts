import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import {
  signSessionToken,
  verifySessionToken,
  type SessionClaims,
} from "@/lib/auth/tokens";
import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import type { PublicUser, UserDoc } from "@/types/user";
import User from "@/models/User";

export const SESSION_COOKIE = "ql_session";

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

export function toPublicUser(user: Pick<UserDoc, "_id" | "email" | "name" | "role">): PublicUser {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.isProduction,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;

export async function createSessionToken(
  user: Pick<UserDoc, "_id" | "email" | "name" | "role">
): Promise<string> {
  return signSessionToken({
    sub: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export async function createSessionCookie(
  user: Pick<UserDoc, "_id" | "email" | "name" | "role">
): Promise<void> {
  const token = await createSessionToken(user);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), token, sessionCookieOptions);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName());
}

export async function readSessionClaims(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionUser(): Promise<UserDoc | null> {
  const claims = await readSessionClaims();
  if (!claims) return null;

  await dbConnect();
  const user = await User.findById(claims.sub)
    .select("_id email name role")
    .lean()
    .exec();
  return user ?? null;
}

/**
 * Returns the currently authenticated user, or null. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<UserDoc | null> => {
  return getSessionUser();
});

export async function getCurrentPublicUser(): Promise<PublicUser | null> {
  const user = await getCurrentUser();
  return user ? toPublicUser(user) : null;
}
