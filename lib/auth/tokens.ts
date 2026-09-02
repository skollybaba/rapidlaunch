import "server-only";

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "@/lib/env";

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const RESET_TTL = 60 * 60; // 1 hour

function getSecret(): Uint8Array {
  const secret = env.authSecret;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionClaims {
  sub: string;
  email: string;
  name?: string;
  role: string;
  type: "session";
}

export interface ResetClaims {
  sub: string;
  type: "password_reset";
}

export async function signSessionToken(
  claims: Omit<SessionClaims, "type">
): Promise<string> {
  return new SignJWT({ ...claims, type: "session" } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(getSecret());
}

export async function signPasswordResetToken(userId: string): Promise<string> {
  return new SignJWT({ type: "password_reset" } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${RESET_TTL}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.type !== "session" || !payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: payload.name ? String(payload.name) : undefined,
      role: String(payload.role ?? "customer"),
      type: "session",
    } satisfies SessionClaims;
  } catch {
    return null;
  }
}

export async function verifyPasswordResetToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.type !== "password_reset" || !payload.sub) return null;
    return String(payload.sub);
  } catch {
    return null;
  }
}
