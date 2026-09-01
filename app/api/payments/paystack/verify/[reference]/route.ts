import { apiOk, handleApiError, newRequestId } from "@/lib/api";
import { verifyCheckoutPayment } from "@/lib/services/order-service";

export const runtime = "nodejs";

interface VerifyProps {
  params: Promise<{ reference: string }>;
}

export async function GET(_request: Request, { params }: VerifyProps) {
  const requestId = newRequestId();
  const { reference } = await params;

  try {
    const result = await verifyCheckoutPayment(reference);
    return apiOk(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}