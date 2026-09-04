import { apiError, apiOk, newRequestId } from "@/lib/api";
import { getCurrentPublicUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const requestId = newRequestId();
  try {
    const user = await getCurrentPublicUser();
    return apiOk({ user });
  } catch {
    return apiError(
      500,
      "SESSION_READ_FAILED",
      "We could not read your session. Please try again.",
      requestId
    );
  }
}
