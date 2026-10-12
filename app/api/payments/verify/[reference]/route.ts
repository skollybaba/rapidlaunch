import { apiOk, handleApiError, newRequestId } from "@/lib/api";
import { verifyCheckoutPayment } from "@/lib/services/order-service";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface VerifyProps {
  params: Promise<{ reference: string }>;
}

/**
 * Provider-agnostic payment verification. The provider is derived from the
 * stored payment record rather than the current admin selection.
 */
export async function GET(request: NextRequest, { params }: VerifyProps) {
  const requestId = newRequestId();
  const { reference } = await params;
  const fast = new URL(request.url).searchParams.get("fast") === "1";

  try {
    const result = await verifyCheckoutPayment(reference, { fast });
    return apiOk(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
