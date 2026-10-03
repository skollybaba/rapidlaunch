import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { updateServiceConfig } from "@/lib/services/admin-service";

export const runtime = "nodejs";

const serviceConfigSchema = z
  .object({
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    inquiryMode: z.enum(["NONE", "INTEREST", "QUOTE"]).optional(),
    fulfillmentMode: z.enum(["SCHEDULER", "MANUAL"]).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.status !== undefined ||
      value.inquiryMode !== undefined ||
      value.fulfillmentMode !== undefined,
    { message: "Nothing to update" }
  );

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  const { serviceId } = await params;
  if (!serviceId) {
    return apiError(400, "VALIDATION_ERROR", "Missing engagement id.", requestId);
  }

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
    const parsed = serviceConfigSchema.parse(body);
    const updated = await updateServiceConfig(serviceId, parsed);
    return apiOk(updated);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}