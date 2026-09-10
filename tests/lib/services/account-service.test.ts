import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

const envMocks = vi.hoisted(() => ({
  env: {
    GOOGLE_CALENDAR_TIME_ZONE: "Africa/Lagos",
    GOOGLE_CALENDAR_ORGANIZER_NAME: "Agile Minds Hub",
    GOOGLE_CALENDAR_WORK_START: "09:00",
    GOOGLE_CALENDAR_WORK_END: "17:00",
    GOOGLE_CLIENT_ID: "client",
    GOOGLE_CLIENT_SECRET: "secret",
    GOOGLE_REFRESH_TOKEN: "refresh",
    GOOGLE_CALENDAR_OWNER_EMAIL: "owner@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

vi.mock("@/lib/env", () => ({ env: envMocks.env }));

const slotMocks = vi.hoisted(() => ({
  getAvailabilitySlots: vi.fn(),
  calendarConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/services/slot-service", () => ({
  getAvailabilitySlots: slotMocks.getAvailabilitySlots,
  calendarConfigured: slotMocks.calendarConfigured,
}));

const mailMocks = vi.hoisted(() => ({
  sendTemplateEmail: vi.fn().mockResolvedValue({
    providerMessageId: "m1",
    sentAt: new Date(),
  }),
}));

vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: vi.fn().mockReturnValue({
    sendTemplateEmail: mailMocks.sendTemplateEmail,
  }),
}));

const calendarMocks = vi.hoisted(() => ({
  createMeetEvent: vi.fn(),
  cancelEvent: vi.fn().mockResolvedValue(undefined),
  createGoogleCalendarAdapter: vi.fn(() => ({
    createMeetEvent: calendarMocks.createMeetEvent,
    cancelEvent: calendarMocks.cancelEvent,
  })),
}));

vi.mock("@/lib/providers/calendar", () => ({
  createGoogleCalendarAdapter: calendarMocks.createGoogleCalendarAdapter,
}));

vi.mock("@/models/Order", () => ({
  Order: { find: vi.fn(), findById: vi.fn() },
}));

vi.mock("@/models/Booking", () => ({
  Booking: { find: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() },
}));

vi.mock("@/models/Product", () => ({
  Product: { find: vi.fn() },
}));

vi.mock("@/models/Fulfillment", () => ({
  Fulfillment: { findOneAndUpdate: vi.fn() },
}));

import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import {
  AccountServiceError,
  RESCHEDULE_WINDOW_MS,
  getSessionsForUser,
  rescheduleSession,
} from "@/lib/services/account-service";

const mockOrderFind = vi.mocked(Order.find);
const mockOrderFindById = vi.mocked(Order.findById);
const mockBookingFind = vi.mocked(Booking.find);
const mockBookingFindOne = vi.mocked(Booking.findOne);
const mockBookingUpdateOne = vi.mocked(Booking.updateOne);
const mockProductFind = vi.mocked(Product.find);
const mockFulfillmentUpdate = vi.mocked(Fulfillment.findOneAndUpdate);
const mockGetAvailabilitySlots = vi.mocked(slotMocks.getAvailabilitySlots);
const mockCalendarConfigured = vi.mocked(slotMocks.calendarConfigured);
const mockCreateMeetEvent = vi.mocked(calendarMocks.createMeetEvent);
const mockCancelEvent = vi.mocked(calendarMocks.cancelEvent);
const mockSendTemplateEmail = vi.mocked(mailMocks.sendTemplateEmail);

function selectLeanExec(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function bookingFindChain(value: unknown) {
  return {
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function bookingFindOneChain(value: unknown) {
  return {
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function execChain(value: unknown) {
  return { exec: vi.fn().mockResolvedValue(value) } as never;
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: "ORD1",
    orderReference: "QL-1001",
    userId: "U1",
    items: [{ titleSnapshot: "Product Strategy Session" }],
    ...overrides,
  };
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  const base = {
    _id: "BK1",
    orderId: "ORD1",
    productId: "PROD1",
    customerEmail: "buyer@example.com",
    customerName: "Buyer Person",
    timezone: "Africa/Lagos",
    status: "CONFIRMED",
    provider: "manual",
    scheduledStartTime: new Date(),
    scheduledEndTime: new Date(),
    requestedStartTime: new Date(),
    meetingUrl: "",
    providerEventUri: "",
    providerBookingUri: "",
    lastRescheduledAt: null,
    answers: {
      whatYouAreBuilding: "An MVP",
    },
  };
  const durationMinutes = (overrides.durationMinutes as number | undefined) ?? 90;
  const start = (overrides.scheduledStartTime as Date | undefined) ?? base.scheduledStartTime;
  return {
    ...base,
    ...overrides,
    scheduledStartTime: start,
    scheduledEndTime: overrides.scheduledEndTime ?? new Date(start.getTime() + durationMinutes * 60_000),
  };
}

const farFuture = () => new Date(Date.now() + RESCHEDULE_WINDOW_MS + 60_000);
const newSlotStart = () => new Date(Date.now() + 2 * 86_400_000);

beforeEach(() => {
  vi.clearAllMocks();
  mockOrderFind.mockReset();
  mockOrderFindById.mockReset();
  mockBookingFind.mockReset();
  mockBookingFindOne.mockReset();
  mockBookingUpdateOne.mockReset();
  mockProductFind.mockReset();
  mockFulfillmentUpdate.mockReset();
  mockGetAvailabilitySlots.mockReset();
  mockCalendarConfigured.mockReset().mockReturnValue(false);
  mockCreateMeetEvent.mockReset();
  mockCancelEvent.mockReset().mockResolvedValue(undefined);
  mockSendTemplateEmail.mockReset();
  mockSendTemplateEmail.mockResolvedValue({
    providerMessageId: "m1",
    sentAt: new Date(),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSessionsForUser", () => {
  beforeEach(() => {
    mockOrderFind.mockReturnValue(selectLeanExec([makeOrder()]));
    mockProductFind.mockReturnValue(
      selectLeanExec([{ _id: "PROD1", title: "Consultation" }])
    );
  });

  it("marks a session as reschedulable more than 24 hours before it starts", async () => {
    mockBookingFind.mockReturnValue(
      bookingFindChain([
        makeBooking({
          durationMinutes: 90,
          scheduledStartTime: farFuture(),
        }),
      ])
    );

    const sessions = await getSessionsForUser("U1");
    expect(sessions[0].rescheduleAvailable).toBe(true);
    expect(sessions[0].durationMinutes).toBe(90);
  });

  it("does not allow rescheduling within 24 hours of the start time", async () => {
    mockBookingFind.mockReturnValue(
      bookingFindChain([
        makeBooking({
          scheduledStartTime: new Date(Date.now() + RESCHEDULE_WINDOW_MS - 60_000),
        }),
      ])
    );

    const sessions = await getSessionsForUser("U1");
    expect(sessions[0].rescheduleAvailable).toBe(false);
  });

  it("does not allow rescheduling cancelled sessions", async () => {
    mockBookingFind.mockReturnValue(
      bookingFindChain([
        makeBooking({ status: "CANCELLED", scheduledStartTime: farFuture() }),
      ])
    );

    const sessions = await getSessionsForUser("U1");
    expect(sessions[0].rescheduleAvailable).toBe(false);
  });
});

describe("rescheduleSession", () => {
  function setupBooking(overrides: Record<string, unknown> = {}) {
    const booking = makeBooking({
      scheduledStartTime: farFuture(),
      ...overrides,
    });
    mockOrderFind.mockReturnValue(selectLeanExec([makeOrder()]));
    mockOrderFindById.mockReturnValue(selectLeanExec(makeOrder()));
    mockBookingFindOne.mockReturnValue(bookingFindOneChain(booking));
    return booking;
  }

  const newSlot = () => {
    const start = newSlotStart();
    const end = new Date(start.getTime() + 90 * 60_000);
    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      start,
      end,
    };
  };

  function confirmSlot() {
    const slot = newSlot();
    mockGetAvailabilitySlots.mockResolvedValue({
      slots: [{ startTime: slot.startTime, endTime: slot.endTime }],
      timezone: "Africa/Lagos",
      durationMinutes: 90,
      demo: false,
    });
    mockBookingUpdateOne.mockReturnValue(execChain({ matchedCount: 1 }));
    mockFulfillmentUpdate.mockReturnValue(execChain({ matchedCount: 1 }));
    return slot;
  }

  it("reschedules a manual booking and sends a confirmation email", async () => {
    setupBooking({ provider: "manual" });
    const slot = confirmSlot();

    const result = await rescheduleSession("BK1", "U1", {
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    expect(result.scheduledStartTime).toBe(slot.startTime);
    expect(mockBookingUpdateOne).toHaveBeenCalledWith(
      { _id: "BK1" },
      {
        $set: expect.objectContaining({
          scheduledStartTime: slot.start,
          scheduledEndTime: slot.end,
          status: "CONFIRMED",
          lastRescheduledAt: expect.any(Date),
          lastReminderSentAt: null,
          reminders: [],
        }),
      }
    );
    expect(mockCreateMeetEvent).not.toHaveBeenCalled();
    expect(mockSendTemplateEmail).toHaveBeenCalledWith({
      templateKey: "booking_rescheduled",
      to: "buyer@example.com",
      variables: expect.objectContaining({
        itemTitle: "Product Strategy Session",
        meetingUrl: "",
      }),
    });
  });

  it("moves the Google Calendar event and Meet link on reschedule", async () => {
    setupBooking({
      provider: "google_calendar",
      meetingUrl: "https://meet.google.com/old",
      providerEventUri: "EVENT_OLD",
    });
    const slot = confirmSlot();
    mockCalendarConfigured.mockReturnValue(true);
    mockCreateMeetEvent.mockResolvedValue({
      id: "EVENT_NEW",
      htmlLink: "https://calendar.google.com/event?eid=new",
      hangoutLink: "https://meet.google.com/new",
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    const result = await rescheduleSession("BK1", "U1", {
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    expect(mockCreateMeetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: slot.startTime,
        attendeeEmail: "buyer@example.com",
        summary: "Product Strategy Session",
      })
    );
    expect(mockCancelEvent).toHaveBeenCalledWith("EVENT_OLD");
    expect(result.meetingUrl).toBe("https://meet.google.com/new");
    expect(mockBookingUpdateOne).toHaveBeenCalledWith(
      { _id: "BK1" },
      {
        $set: expect.objectContaining({
          meetingUrl: "https://meet.google.com/new",
          providerEventUri: "EVENT_NEW",
        }),
      }
    );
  });

  it("keeps the old booking unchanged when the new event cannot be created", async () => {
    setupBooking({ provider: "google_calendar" });
    confirmSlot();
    mockCalendarConfigured.mockReturnValue(true);
    mockCreateMeetEvent.mockRejectedValue(new Error("provider down"));

    await expect(
      rescheduleSession("BK1", "U1", {
        startTime: newSlot().startTime,
        endTime: newSlot().endTime,
      })
    ).rejects.toMatchObject({ code: "RESCHEDULE_FAILED" });
    expect(mockBookingUpdateOne).not.toHaveBeenCalled();
  });

  it("still reschedules when the confirmation email fails", async () => {
    setupBooking({ provider: "manual" });
    const slot = confirmSlot();
    mockSendTemplateEmail.mockRejectedValue(new Error("smtp down"));

    const result = await rescheduleSession("BK1", "U1", {
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    expect(result.id).toBe("BK1");
    expect(mockBookingUpdateOne).toHaveBeenCalled();
  });

  it("rejects sessions that do not belong to the user", async () => {
    mockOrderFind.mockReturnValue(selectLeanExec([makeOrder()]));
    mockBookingFindOne.mockReturnValue(bookingFindOneChain(null));

    await expect(
      rescheduleSession("BK99", "U1", {
        startTime: "2026-10-01T10:00:00.000Z",
        endTime: "2026-10-01T11:30:00.000Z",
      })
    ).rejects.toMatchObject({ code: "SESSION_NOT_FOUND", status: 404 });
    expect(mockBookingUpdateOne).not.toHaveBeenCalled();
  });

  it("rejects rescheduling within 24 hours of the start time", async () => {
    setupBooking({
      scheduledStartTime: new Date(Date.now() + RESCHEDULE_WINDOW_MS),
    });
    const slot = newSlot();

    await expect(
      rescheduleSession("BK1", "U1", {
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
    ).rejects.toMatchObject({ code: "RESCHEDULE_NOT_AVAILABLE" });
    expect(mockGetAvailabilitySlots).not.toHaveBeenCalled();
  });

  it("rejects sessions with no scheduled start time", async () => {
    setupBooking({ scheduledStartTime: null });
    const slot = newSlot();

    await expect(
      rescheduleSession("BK1", "U1", {
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
    ).rejects.toMatchObject({ code: "RESCHEDULE_NOT_AVAILABLE" });
  });

  it("rejects cancelled sessions", async () => {
    setupBooking({ status: "CANCELLED", scheduledStartTime: farFuture() });
    const slot = newSlot();

    await expect(
      rescheduleSession("BK1", "U1", {
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
    ).rejects.toMatchObject({ code: "SESSION_NOT_ACTIVE", status: 409 });
  });

  it("rejects slots that are no longer available", async () => {
    setupBooking({ provider: "manual" });
    const chosen = newSlot();
    mockGetAvailabilitySlots.mockResolvedValue({
      slots: [
        {
          startTime: new Date(chosen.start.getTime() + 60_000).toISOString(),
          endTime: new Date(chosen.end.getTime() + 60_000).toISOString(),
        },
      ],
      timezone: "Africa/Lagos",
      durationMinutes: 90,
      demo: false,
    });

    await expect(
      rescheduleSession("BK1", "U1", {
        startTime: chosen.startTime,
        endTime: chosen.endTime,
      })
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE", status: 409 });
    expect(mockBookingUpdateOne).not.toHaveBeenCalled();
  });

  it("rejects with a retryable error when availability cannot be checked", async () => {
    setupBooking({ provider: "manual" });
    const slot = newSlot();
    mockGetAvailabilitySlots.mockRejectedValue(new Error("cal down"));

    await expect(
      rescheduleSession("BK1", "U1", {
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE", status: 503 });
  });

  it("rejects malformed or non-future times", async () => {
    setupBooking({ provider: "manual" });
    const slot = newSlot();

    await expect(
      rescheduleSession("BK1", "U1", {
        startTime: slot.endTime,
        endTime: slot.startTime,
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      rescheduleSession("BK1", "U1", {
        startTime: new Date(Date.now() - 60_000).toISOString(),
        endTime: new Date(Date.now() - 30_000).toISOString(),
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("surfaces AccountServiceError instances for the API handler", () => {
    const error = new AccountServiceError(
      "SESSION_NOT_FOUND",
      "Session not found.",
      404
    );
    expect(error.status).toBe(404);
    expect(error.code).toBe("SESSION_NOT_FOUND");
    expect(error).toBeInstanceOf(Error);
  });
});