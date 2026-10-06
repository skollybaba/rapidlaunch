import { NextRequest } from "next/server";

import { apiError, apiOk, newRequestId } from "@/lib/api";
import { isReminderSecret } from "@/lib/services/reminder-service";
import { dispatchDueBroadcasts } from "@/lib/services/broadcast-dispatch-service";

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
    const result = await dispatchDueBroadcasts();
    return apiOk({
      processed: result.processed,
      delivered: result.delivered,
      skipped: result.skipped,
      failed: result.failed,
    });
  } catch (error) {
    console.error("Scheduled broadcast dispatch failed", { error });
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Could not dispatch scheduled broadcasts right now.",
      requestId
    );
  }
}
