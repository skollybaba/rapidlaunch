import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { dismissBooking } from "@/lib/services/admin-service";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const requestId = newRequestId();
  const { bookingId } = await params;

  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin") return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  if (!bookingId) {
    return apiError(400, "VALIDATION_ERROR", "Missing booking id.", requestId);
  }

  try {
    const result = await dismissBooking(bookingId);
    return apiOk(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}