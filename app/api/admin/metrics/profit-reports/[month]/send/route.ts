import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import { sendProfitReportEmail } from "@/lib/services/profit-service";
import { apiOk, apiError, handleApiError, newRequestId } from "@/lib/api";
import { z } from "zod";

const SendSchema = z.object({
  to: z.array(z.string().email()).min(1),
});

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ month: string }> }
) {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return apiError(401, "UNAUTHORIZED", "Admin access required", requestId);
    }

    const { month } = await params;
    const body = await request.json();
    const parsed = SendSchema.parse(body);

    await sendProfitReportEmail(month, parsed.to);
    return apiOk({ sent: true });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}