import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { retryOrderFulfillment } from "@/lib/services/fulfillment-service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const requestId = newRequestId();
  const { orderId } = await params;

  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin") return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  if (!orderId) {
    return apiError(400, "VALIDATION_ERROR", "Missing order id.", requestId);
  }

  try {
    const outcome = await retryOrderFulfillment(orderId);
    return apiOk(outcome);
  } catch (error) {
    if (error instanceof Error && error.message === "Order not found") {
      return apiError(404, "NOT_FOUND", "Order not found.", requestId);
    }
    if (error instanceof Error && error.message.includes("Only paid")) {
      return apiError(409, "CONFLICT", error.message, requestId);
    }
    return handleApiError(error, requestId);
  }
}
