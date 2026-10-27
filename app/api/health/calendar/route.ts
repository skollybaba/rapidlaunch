import { NextRequest } from "next/server";

import { apiError, apiOk, newRequestId } from "@/lib/api";
import { env } from "@/lib/env";
import { GoogleCalendarProviderError } from "@/lib/providers/calendar";
import {
  calendarConfigured,
  getAvailabilitySlots,
} from "@/lib/services/slot-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = newRequestId();

  const secret = request.nextUrl.searchParams.get("secret") ?? "";
  if (secret !== env.REMINDER_CRON_SECRET) {
    return apiError(401, "UNAUTHORIZED", "Missing or invalid secret.", requestId);
  }

  const configured = calendarConfigured();

  if (!configured) {
    return apiOk({
      configured: false,
      ok: false,
      timezone: env.GOOGLE_CALENDAR_TIME_ZONE,
      error: {
        code: "NOT_CONFIGURED",
        message:
          "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN and GOOGLE_CALENDAR_OWNER_EMAIL.",
      },
    });
  }

  try {
    const result = await getAvailabilitySlots({
      days: 2,
      durationMinutes: 30,
    });

    return apiOk({
      configured: true,
      ok: true,
      timezone: result.timezone,
      demo: result.demo,
      slots: result.slots.length,
    });
  } catch (error) {
    if (error instanceof GoogleCalendarProviderError) {
      return apiOk({
        configured: true,
        ok: false,
        timezone: env.GOOGLE_CALENDAR_TIME_ZONE,
        error: {
          code: error.code,
          retryable: error.retryable,
          message:
            error.code === "UNAUTHORIZED"
              ? "The Google refresh token is invalid or expired. Generate a new one with npm run calendar:auth."
              : "Google Calendar could not be reached.",
        },
      });
    }
    throw error;
  }
}
