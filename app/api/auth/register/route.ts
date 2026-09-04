import { NextRequest } from "next/server";

import { apiOk, handleApiError, newRequestId } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { registerUser } from "@/lib/services/auth-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = newRequestId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: { code: "INVALID_JSON", message: "Invalid JSON" },
      },
      { status: 400 }
    );
  }

  try {
    const { user, sessionToken } = await registerUser(body);
    const response = apiOk({ user });
    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions);
    return response;
  } catch (error) {
    return handleApiError(error, requestId);
  }
}