import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { createLead } from "@/lib/services/lead-service";
import { interestFormSchema, quoteFormSchema } from "@/lib/validation/leads";

export const runtime = "nodejs";

/**
 * Public catalogue enquiry endpoint.
 *
 * The submission carries customer-supplied prose only. The engagement, its
 * price and whether money is payable are resolved from the product record by
 * lead-service, never from the request body.
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

  if (typeof body !== "object" || body === null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid request", requestId);
  }

  const { mode, productSlug, ...fields } = body as Record<string, unknown>;

  if (typeof mode !== "string") {
    return apiError(400, "VALIDATION_ERROR", "Unknown enquiry type", requestId);
  }

  if (typeof productSlug !== "string" || productSlug.length === 0) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "Missing engagement",
      requestId
    );
  }

  try {
    if (mode === "interest") {
      const parsed = interestFormSchema.parse(fields);
      const lead = await createLead({ ...parsed, productSlug });
      return apiOk(lead);
    }

    if (mode === "quote") {
      const parsed = quoteFormSchema.parse(fields);
      const lead = await createLead({ ...parsed, productSlug });
      return apiOk(lead);
    }

    return apiError(400, "VALIDATION_ERROR", "Unknown enquiry type", requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}