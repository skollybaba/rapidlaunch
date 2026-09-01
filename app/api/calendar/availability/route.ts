import { NextRequest } from "next/server";

import { apiError, apiOk, newRequestId } from "@/lib/api";
import { env } from "@/lib/env";
import {
  createGoogleCalendarAdapter,
  GoogleCalendarProviderError,
} from "@/lib/providers/calendar";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = newRequestId();

  const calendarId = env.GOOGLE_CALENDAR_OWNER_EMAIL;
  if (
    !calendarId ||
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REFRESH_TOKEN
  ) {
    return apiError(
      503,
      "GOOGLE_CALENDAR_NOT_CONFIGURED",
      "Google Calendar booking is being set up.",
      requestId
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const daysParam = Number(searchParams.get("days") ?? 14);
  const days = Math.min(Math.max(Number.isFinite(daysParam) ? daysParam : 14, 1), 30);
  const durationParam = Number(searchParams.get("durationMinutes") ?? 90);
  const durationMinutes = Math.min(
    Math.max(Number.isFinite(durationParam) ? durationParam : 90, 15),
    240
  );
  const timezone = searchParams.get("timezone") || undefined;

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + days);

  const adapter = createGoogleCalendarAdapter({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken: env.GOOGLE_REFRESH_TOKEN,
    calendarId,
    timezone: env.GOOGLE_CALENDAR_TIME_ZONE,
    workStart: env.GOOGLE_CALENDAR_WORK_START,
    workEnd: env.GOOGLE_CALENDAR_WORK_END,
  });

  try {
    const slots = await adapter.getAvailableSlots({
      from: from.toISOString(),
      to: to.toISOString(),
      durationMinutes,
      timezone,
    });
    return apiOk({
      slots,
      timezone: env.GOOGLE_CALENDAR_TIME_ZONE,
      durationMinutes,
    });
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