import "server-only";

import { randomUUID } from "node:crypto";

import { google, type calendar_v3 } from "googleapis";

export interface GoogleCalendarAdapterConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
  timezone: string;
  workStart: string;
  workEnd: string;
}

export interface CalendarSlot {
  startTime: string;
  endTime: string;
}

export interface GetAvailableSlotsInput {
  from: string;
  to: string;
  durationMinutes: number;
  timezone?: string;
}

export interface CreateMeetEventInput {
  calendarId: string;
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  attendeeEmail: string;
  attendeeName?: string;
}

export interface CreatedMeetEvent {
  id: string;
  htmlLink: string;
  hangoutLink?: string;
  startTime: string;
  endTime: string;
}

export type GoogleCalendarErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "PROVIDER_MALFORMED_RESPONSE"
  | "PROVIDER_UNAVAILABLE";

export interface GoogleCalendarAdapter {
  getAvailableSlots(input: GetAvailableSlotsInput): Promise<CalendarSlot[]>;

  createMeetEvent(input: CreateMeetEventInput): Promise<CreatedMeetEvent>;
}

export class GoogleCalendarProviderError extends Error {
  readonly code: GoogleCalendarErrorCode;
  readonly retryable: boolean;

  constructor(code: GoogleCalendarErrorCode, message: string, retryable: boolean) {
    super(message);
    this.name = "GoogleCalendarProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

function isGoogleCalendarProviderError(
  error: unknown
): error is GoogleCalendarProviderError {
  return error instanceof GoogleCalendarProviderError;
}

export class HttpGoogleCalendarAdapter implements GoogleCalendarAdapter {
  constructor(private readonly config: GoogleCalendarAdapterConfig) {}

  private client(): calendar_v3.Calendar {
    const oauth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret
    );
    oauth.setCredentials({ refresh_token: this.config.refreshToken });
    return google.calendar({ version: "v3", auth: oauth });
  }

  async getAvailableSlots(input: GetAvailableSlotsInput): Promise<CalendarSlot[]> {
    const { from, to, durationMinutes } = input;
    const timezone = input.timezone ?? this.config.timezone;

    const workStart = parseClock(this.config.workStart);
    const workEnd = parseClock(this.config.workEnd);

    const calendar = this.client();

    const busy: { start: Date; end: Date }[] = [];

    try {
      const freebusy = await calendar.freebusy.query({
        requestBody: {
          timeMin: from,
          timeMax: to,
          timeZone: timezone,
          items: [{ id: this.config.calendarId }],
        },
      });
      const calendars = freebusy.data.calendars ?? {};
      for (const entry of calendars[this.config.calendarId]?.busy ?? []) {
        if (entry.start && entry.end) {
          busy.push({ start: new Date(entry.start), end: new Date(entry.end) });
        }
      }
    } catch (error) {
      throw mapGoogleApiError(error);
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const toDayStart = startOfDayInTimezone(toDate, timezone);
    const slots: CalendarSlot[] = [];

    for (
      let dayStart = startOfDayInTimezone(fromDate, timezone);
      dayStart < toDayStart;
      dayStart = startOfDayInTimezone(new Date(dayStart + 86_400_000), timezone)
    ) {
      const { year, month, day } = datePartsInTimezone(dayStart, timezone);
      if (isWeekend(year, month, day)) continue;

      const workStartUtc = wallClockToUtc(year, month, day, workStart, timezone);
      const workEndUtc = wallClockToUtc(year, month, day, workEnd, timezone);

      for (
        let start = workStartUtc;
        start + durationMinutes * 60_000 <= workEndUtc;
        start += durationMinutes * 60_000
      ) {
        const slotStart = new Date(start);
        const slotEnd = new Date(start + durationMinutes * 60_000);
        if (slotEnd.getTime() <= Date.now()) continue;
        if (overlapsBusy(slotStart, slotEnd, busy)) continue;
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        });
      }

      if (slots.length >= 60) break;
    }

    return slots.slice(0, 60);
  }

  async createMeetEvent(input: CreateMeetEventInput): Promise<CreatedMeetEvent> {
    const calendar = this.client();

    let created: calendar_v3.Schema$Event;
    try {
      const response = await calendar.events.insert({
        calendarId: input.calendarId,
        conferenceDataVersion: 1,
        sendUpdates: "all",
        requestBody: {
          summary: input.summary,
          description: input.description,
          start: { dateTime: input.startTime, timeZone: input.timezone },
          end: { dateTime: input.endTime, timeZone: input.timezone },
          attendees: [
            {
              email: input.attendeeEmail,
              displayName: input.attendeeName,
            },
          ],
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
      });
      created = response.data;
    } catch (error) {
      throw mapGoogleApiError(error);
    }

    if (!created.id || !created.htmlLink) {
      throw new GoogleCalendarProviderError(
        "PROVIDER_MALFORMED_RESPONSE",
        "Google Calendar returned an unexpected event response",
        false
      );
    }

    return {
      id: created.id,
      htmlLink: created.htmlLink,
      hangoutLink: created.hangoutLink ?? undefined,
      startTime: created.start?.dateTime ?? input.startTime,
      endTime: created.end?.dateTime ?? input.endTime,
    };
  }
}

function mapGoogleApiError(error: unknown): GoogleCalendarProviderError {
  if (isGoogleCalendarProviderError(error)) return error;

  const status =
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "status" in error.response
      ? Number(error.response.status)
      : 0;

  if (status === 401) {
    return new GoogleCalendarProviderError(
      "UNAUTHORIZED",
      "Google Calendar authorization failed",
      false
    );
  }
  if (status === 403) {
    return new GoogleCalendarProviderError(
      "FORBIDDEN",
      "Google Calendar access is forbidden",
      false
    );
  }
  if (status === 429) {
    return new GoogleCalendarProviderError(
      "RATE_LIMITED",
      "Google Calendar rate limit reached",
      true
    );
  }
  const retryable = status === 0 || status >= 500;
  return new GoogleCalendarProviderError(
    retryable ? "PROVIDER_UNAVAILABLE" : "PROVIDER_MALFORMED_RESPONSE",
    "Google Calendar could not complete the request",
    retryable
  );
}

function parseClock(clock: string): { hour: number; minute: number } {
  const [hour, minute] = clock.split(":").map(Number);
  return { hour: Number.isFinite(hour) ? hour : 9, minute: Number.isFinite(minute) ? minute : 0 };
}

function datePartsInTimezone(
  utcMs: number,
  timezone: string
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(utcMs));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function utcOffsetMs(utcMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUTC - utcMs;
}

function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  clock: { hour: number; minute: number },
  timezone: string
): number {
  const wanted = Date.UTC(year, month - 1, day, clock.hour, clock.minute);
  let estimate = wanted;
  for (let i = 0; i < 3; i++) {
    const offset = utcOffsetMs(estimate, timezone);
    estimate = wanted - offset;
  }
  return estimate;
}

function startOfDayInTimezone(date: Date, timezone: string): number {
  const { year, month, day } = datePartsInTimezone(date.getTime(), timezone);
  return wallClockToUtc(year, month, day, { hour: 0, minute: 0 }, timezone);
}

function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

function overlapsBusy(
  start: Date,
  end: Date,
  busy: { start: Date; end: Date }[]
): boolean {
  return busy.some(
    (period) => start.getTime() < period.end.getTime() && end.getTime() > period.start.getTime()
  );
}

export function createGoogleCalendarAdapter(
  config: GoogleCalendarAdapterConfig
): GoogleCalendarAdapter {
  return new HttpGoogleCalendarAdapter(config);
}

export default createGoogleCalendarAdapter;