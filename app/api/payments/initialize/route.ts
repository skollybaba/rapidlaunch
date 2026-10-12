import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { initializeCheckoutPayment } from "@/lib/services/order-service";
import { resolvePaymentProvider } from "@/lib/services/payment-settings-service";

export const runtime = "nodejs";

/**
 * Provider-agnostic checkout initialization. The active provider is resolved
 * on the server from admin settings, with an automatic fallback to Paystack
 * when the selected provider has no credentials.
 */
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
    const resolved = await resolvePaymentProvider();
    const result = await initializeCheckoutPayment(body, {
      provider: resolved.provider,
    });

    return apiOk({
      ...result,
      paymentFallback: resolved.fellBack
        ? { requested: resolved.requested, used: resolved.provider }
        : null,
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
