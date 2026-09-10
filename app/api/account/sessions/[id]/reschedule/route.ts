import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { requestSessionReschedule } from "@/lib/services/account-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }

  if (!id) {
    return apiError(400, "VALIDATION_ERROR", "Missing session id.", requestId);
  }

  try {
    const result = await requestSessionReschedule(id, String(user._id));
    return apiOk(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}