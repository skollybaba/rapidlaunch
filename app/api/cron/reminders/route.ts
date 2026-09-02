import { NextRequest } from "next/server";

import { apiError, apiOk, newRequestId } from "@/lib/api";
import {
  dispatchBookingReminders,
  isReminderSecret,
} from "@/lib/services/reminder-service";

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
    const result = await dispatchBookingReminders();
    return apiOk({
      dispatched: result.dispatched,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error("Booking reminder dispatch failed", { error });
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Could not dispatch reminders right now.",
      requestId
    );
  }
}