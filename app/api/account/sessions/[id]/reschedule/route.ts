import { z } from "zod";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { rescheduleSession } from "@/lib/services/account-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  startTime: z.string().min(1, "Pick a new time for your session."),
  endTime: z.string().min(1, "Pick a new time for your session."),
});

export async function POST(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Invalid JSON body.", requestId);
  }
  try {
    const input = bodySchema.parse(body);
    const result = await rescheduleSession(id, String(user._id), input);
    return apiOk(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}