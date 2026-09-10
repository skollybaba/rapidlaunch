import { NextRequest } from "next/server";

import { apiError, apiOk, newRequestId } from "@/lib/api";
import { GoogleCalendarProviderError } from "@/lib/providers/calendar";
import { getAvailabilitySlots } from "@/lib/services/slot-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = newRequestId();

  const searchParams = request.nextUrl.searchParams;
  const daysParam = Number(searchParams.get("days") ?? 30);
  const durationParam = Number(searchParams.get("durationMinutes") ?? 90);
  const timezone = searchParams.get("timezone") || undefined;

  try {
    const result = await getAvailabilitySlots({
      days: daysParam,
      durationMinutes: durationParam,
      timezone,
    });
    return apiOk(result);
  } catch (error) {
    if (error instanceof GoogleCalendarProviderError) {
      return apiError(
        error.retryable ? 503 : 502,
        error.code,
        "Could not load available times right now.",
        requestId
      );
    }
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Could not load available times right now.",
      requestId
    );
  }
}