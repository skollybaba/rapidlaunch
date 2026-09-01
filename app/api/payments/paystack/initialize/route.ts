import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { initializeCheckoutPayment } from "@/lib/services/order-service";

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
    const result = await initializeCheckoutPayment(body);
    return apiOk(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}