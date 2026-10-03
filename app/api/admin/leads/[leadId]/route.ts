import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminLead, updateLead } from "@/lib/services/lead-service";
import { updateLeadStatusSchema } from "@/lib/validation/leads";

export const runtime = "nodejs";

async function authorize(requestId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const requestId = newRequestId();

  const denied = await authorize(requestId);
  if (denied) return denied;

  const { leadId } = await params;
  if (!leadId) {
    return apiError(400, "VALIDATION_ERROR", "Missing enquiry id.", requestId);
  }

  try {
    const lead = await getAdminLead(leadId);
    if (!lead) {
      return apiError(404, "NOT_FOUND", "Enquiry not found.", requestId);
    }
    return apiOk(lead);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const requestId = newRequestId();

  const denied = await authorize(requestId);
  if (denied) return denied;

  const { leadId } = await params;

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
    const parsed = updateLeadStatusSchema.parse(body);
    const result = await updateLead(leadId, parsed);

    if (!result.ok) {
      return apiError(404, "NOT_FOUND", result.message, requestId);
    }
    return apiOk({ updated: true });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}