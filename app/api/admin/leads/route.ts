import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { listAdminLeads } from "@/lib/services/lead-service";
import { LEAD_OFFERINGS, LEAD_STATUSES } from "@/types/lead";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status");
  const offeringParam = params.get("offering");
  const page = Number(params.get("page")) || 1;

  const status =
    statusParam && LEAD_STATUSES.includes(statusParam as never)
      ? (statusParam as never)
      : undefined;
  const offering =
    offeringParam && LEAD_OFFERINGS.includes(offeringParam as never)
      ? (offeringParam as never)
      : undefined;

  try {
    const result = await listAdminLeads({ status, offering, page });
    return apiOk(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}