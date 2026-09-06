import { NextRequest } from "next/server";

import { apiError, apiOk, newRequestId } from "@/lib/api";
import { isReminderSecret } from "@/lib/services/reminder-service";
import { dispatchFulfillmentRetries } from "@/lib/services/fulfillment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = newRequestId();

  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("secret") ?? "";

  if (!isReminderSecret(token)) {
    return apiError(401, "UNAUTHORIZED", "Missing or invalid secret.", requestId);
  }

  try {
    const result = await dispatchFulfillmentRetries();
    return apiOk({
      processed: result.processed,
      confirmationEmailsSent: result.outcomes.filter(
        (o) => o.confirmationEmailSent
      ).length,
      coursesEnrolled: result.outcomes.filter((o) => o.courseEnrolled).length,
      bookingsConfirmed: result.outcomes.filter((o) => o.bookingConfirmed).length,
    });
  } catch (error) {
    console.error("Fulfillment retry dispatch failed", { error });
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Could not dispatch fulfillment retries right now.",
      requestId
    );
  }
}
