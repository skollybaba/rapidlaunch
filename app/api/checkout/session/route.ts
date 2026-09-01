import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { createCheckoutSession } from "@/lib/services/order-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = newRequestId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(
      400,
      "INVALID_JSON",
      "Request body must be valid JSON",
      requestId
    );
  }

  try {
    const session = await createCheckoutSession(body);
    return apiOk(session);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}