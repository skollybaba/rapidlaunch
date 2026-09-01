import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("googleapis", () => {
  return {
    google: {
      calendar: vi.fn(() => sharedClient),
      auth: {
        OAuth2: vi.fn(function () {
          return { setCredentials: vi.fn() };
        }),
      },
    },
  };
});

const sharedClient = {
  freebusy: { query: vi.fn() },
  events: { insert: vi.fn() },
};

import {
  createGoogleCalendarAdapter,
  GoogleCalendarProviderError,
  HttpGoogleCalendarAdapter,
} from "@/lib/providers/calendar";

const CONFIG = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  calendarId: "owner@gmail.com",
  timezone: "Africa/Lagos",
  workStart: "09:00",
  workEnd: "17:00",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HttpGoogleCalendarAdapter", () => {
  const adapter = createGoogleCalendarAdapter(CONFIG);

  it("lists week-day working-hour slots", async () => {
    sharedClient.freebusy.query.mockResolvedValue({
      data: { calendars: { "owner@gmail.com": { busy: [] } } },
    });

    const slots = await adapter.getAvailableSlots({
      from: "2026-09-07T00:00:00.000Z",
      to: "2026-09-08T00:00:00.000Z",
      durationMinutes: 90,
    });

    expect(sharedClient.freebusy.query).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          timeZone: "Africa/Lagos",
          items: [{ id: "owner@gmail.com" }],
        }),
      })
    );
    // 09:00-17:00 local (UTC+1) => 09:00,10:30,12:00,13:30,15:00 => 5 slots.
    expect(slots).toHaveLength(5);
    expect(slots[0].startTime).toBe("2026-09-07T08:00:00.000Z");
  });

  it("skips slots that overlap a busy window", async () => {
    sharedClient.freebusy.query.mockResolvedValue({
      data: {
        calendars: {
          "owner@gmail.com": {
            busy: [
              { start: "2026-09-07T08:00:00.000Z", end: "2026-09-07T09:30:00.000Z" },
            ],
          },
        },
      },
    });

    const slots = await adapter.getAvailableSlots({
      from: "2026-09-07T00:00:00.000Z",
      to: "2026-09-08T00:00:00.000Z",
      durationMinutes: 90,
    });

    const busyStart = Date.parse("2026-09-07T08:00:00Z");
    const busyEnd = Date.parse("2026-09-07T09:30:00Z");
    for (const slot of slots) {
      const start = new Date(slot.startTime).getTime();
      const end = new Date(slot.endTime).getTime();
      const overlaps = start < busyEnd && end > busyStart;
      expect(overlaps).toBe(false);
      expect(end - start).toBe(90 * 60_000);
    }
  });

  it("creates a Google Meet event with the attendee", async () => {
    sharedClient.events.insert.mockResolvedValue({
      data: {
        id: "EVT1",
        htmlLink: "https://calendar.google.com/event?eid=abc",
        hangoutLink: "https://meet.google.com/abc-def-ghi",
        start: { dateTime: "2026-09-07T09:00:00.000Z" },
        end: { dateTime: "2026-09-07T10:30:00.000Z" },
      },
    });

    const result = await adapter.createMeetEvent({
      calendarId: CONFIG.calendarId,
      summary: "90-Minute Session",
      description: "Building: A booking tool",
      startTime: "2026-09-07T09:00:00.000Z",
      endTime: "2026-09-07T10:30:00.000Z",
      timezone: "Africa/Lagos",
      attendeeEmail: "buyer@example.com",
      attendeeName: "Buyer Person",
    });

    expect(sharedClient.events.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: CONFIG.calendarId,
        conferenceDataVersion: 1,
        sendUpdates: "all",
        requestBody: expect.objectContaining({
          summary: "90-Minute Session",
          start: { dateTime: "2026-09-07T09:00:00.000Z", timeZone: "Africa/Lagos" },
          attendees: [{ email: "buyer@example.com", displayName: "Buyer Person" }],
          conferenceData: {
            createRequest: {
              conferenceSolutionKey: { type: "hangoutsMeet" },
              requestId: expect.any(String),
            },
          },
        }),
      })
    );
    expect(result).toMatchObject({
      id: "EVT1",
      htmlLink: "https://calendar.google.com/event?eid=abc",
      hangoutLink: "https://meet.google.com/abc-def-ghi",
    });
  });

  it("propagates a malformed response as a non-retryable provider error", async () => {
    sharedClient.events.insert.mockResolvedValue({ data: {} });
    await expect(
      adapter.createMeetEvent({
        calendarId: CONFIG.calendarId,
        summary: "S",
        startTime: "2026-09-07T09:00:00.000Z",
        endTime: "2026-09-07T10:30:00.000Z",
        timezone: "Africa/Lagos",
        attendeeEmail: "buyer@example.com",
      })
    ).rejects.toMatchObject({ code: "PROVIDER_MALFORMED_RESPONSE", retryable: false });
  });

  it("maps 403 to a non-retryable forbidden error", async () => {
    sharedClient.events.insert.mockRejectedValue({ response: { status: 403 } });
    await expect(
      adapter.createMeetEvent({
        calendarId: CONFIG.calendarId,
        summary: "S",
        startTime: "2026-09-07T09:00:00.000Z",
        endTime: "2026-09-07T10:30:00.000Z",
        timezone: "Africa/Lagos",
        attendeeEmail: "buyer@example.com",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", retryable: false });
  });

  it("maps transport failures to a retryable provider error", async () => {
    sharedClient.freebusy.query.mockRejectedValue(new Error("timeout"));
    await expect(
      adapter.getAvailableSlots({
        from: "2026-09-07T00:00:00.000Z",
        to: "2026-09-08T00:00:00.000Z",
        durationMinutes: 90,
      })
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE", retryable: true });
  });
});

describe("GoogleCalendarProviderError", () => {
  it("carries code and retryable flags", () => {
    const error = new GoogleCalendarProviderError("RATE_LIMITED", "m", true);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.retryable).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });
});

it("instantiates an HttpGoogleCalendarAdapter from the factory", () => {
  expect(createGoogleCalendarAdapter(CONFIG)).toBeInstanceOf(HttpGoogleCalendarAdapter);
});