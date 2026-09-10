import "server-only";

import { env } from "@/lib/env";
import {
  createGoogleCalendarAdapter,
  type CalendarSlot,
} from "@/lib/providers/calendar";

export interface AvailabilityResult {
  slots: CalendarSlot[];
  timezone: string;
  durationMinutes: number;
  demo: boolean;
}

export function calendarConfigured(): boolean {
  return Boolean(
    env.GOOGLE_CALENDAR_OWNER_EMAIL &&
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_REFRESH_TOKEN
  );
}

function buildDemoSlots(input: {
  timezone: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  durationMinutes: number;
  days: number;
}): CalendarSlot[] {
  const { timezone } = input;
  const slots: CalendarSlot[] = [];
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  for (
    let dayOffset = 0;
    dayOffset < input.days && slots.length < 200;
    dayOffset++
  ) {
    const localStart = new Date(todayStart);
    localStart.setDate(localStart.getDate() + dayOffset);
    const dayName = weekdayName(localStart);
    if (dayName === "Sun") continue;

    for (
      let start =
        input.startHour * 60 + input.startMinute;
      start + input.durationMinutes <=
      input.endHour * 60 + input.endMinute;
      start += input.durationMinutes
    ) {
      const slotStart = wallToUtc(localStart, start, timezone);
      const slotEnd = slotStart + input.durationMinutes * 60_000;
      if (slotEnd <= now) continue;
      slots.push({
        startTime: new Date(slotStart).toISOString(),
        endTime: new Date(slotEnd).toISOString(),
      });
    }
  }

  return slots;
}

function weekdayName(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function wallToUtc(
  localMidnight: Date,
  minutesFromMidnight: number,
  timezone: string
): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(localMidnight));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const y = Number(map.year);
  const mo = Number(map.month);
  const d = Number(map.day);
  const h = Math.floor(minutesFromMidnight / 60);
  const mi = minutesFromMidnight % 60;
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  let estimate = wanted;
  for (let i = 0; i < 3; i++) {
    const offParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(estimate));
    const offMap = Object.fromEntries(
      offParts.map((part) => [part.type, part.value])
    );
    const asUTC = Date.UTC(
      Number(offMap.year),
      Number(offMap.month) - 1,
      Number(offMap.day),
      Number(offMap.hour),
      Number(offMap.minute),
      Number(offMap.second)
    );
    estimate = wanted - (asUTC - estimate);
  }
  return estimate;
}

export async function getAvailabilitySlots(input: {
  days: number;
  durationMinutes: number;
  timezone?: string;
}): Promise<AvailabilityResult> {
  const days = Math.min(Math.max(Number.isFinite(input.days) ? input.days : 30, 1), 30);
  const durationMinutes = Math.min(
    Math.max(Number.isFinite(input.durationMinutes) ? input.durationMinutes : 90, 15),
    240
  );
  const timezone = input.timezone || env.GOOGLE_CALENDAR_TIME_ZONE;

  if (!calendarConfigured()) {
    const [startHour, startMinute] = env.GOOGLE_CALENDAR_WORK_START.split(":").map(Number);
    const [endHour, endMinute] = env.GOOGLE_CALENDAR_WORK_END.split(":").map(Number);
    const slots = buildDemoSlots({
      timezone,
      startHour: Number.isFinite(startHour) ? startHour : 9,
      startMinute: Number.isFinite(startMinute) ? startMinute : 0,
      endHour: Number.isFinite(endHour) ? endHour : 17,
      endMinute: Number.isFinite(endMinute) ? endMinute : 0,
      durationMinutes,
      days,
    });
    return { slots, timezone: env.GOOGLE_CALENDAR_TIME_ZONE, durationMinutes, demo: true };
  }

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + days);

  const adapter = createGoogleCalendarAdapter({
    clientId: env.GOOGLE_CLIENT_ID as string,
    clientSecret: env.GOOGLE_CLIENT_SECRET as string,
    refreshToken: env.GOOGLE_REFRESH_TOKEN as string,
    calendarId: env.GOOGLE_CALENDAR_OWNER_EMAIL as string,
    organizerName: env.GOOGLE_CALENDAR_ORGANIZER_NAME,
    timezone: env.GOOGLE_CALENDAR_TIME_ZONE,
    workStart: env.GOOGLE_CALENDAR_WORK_START,
    workEnd: env.GOOGLE_CALENDAR_WORK_END,
  });

  const slots = await adapter.getAvailableSlots({
    from: from.toISOString(),
    to: to.toISOString(),
    durationMinutes,
    timezone,
  });

  return {
    slots,
    timezone: env.GOOGLE_CALENDAR_TIME_ZONE,
    durationMinutes,
    demo: false,
  };
}