import { NextRequest } from "next/server";

import { apiOk, handleApiError, newRequestId } from "@/lib/api";
import { loginWithGoogle } from "@/lib/services/auth-service";

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
    const user = await loginWithGoogle(body);
    return apiOk({ user });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
