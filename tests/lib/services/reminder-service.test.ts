import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Booking", () => ({
  Booking: { find: vi.fn(), updateOne: vi.fn() },
}));

vi.mock("@/models/Product", () => ({
  Product: { findById: vi.fn() },
}));

vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: vi.fn(() => ({
    sendTemplateEmail: vi.fn().mockResolvedValue({}),
    sendEmail: vi.fn().mockResolvedValue({}),
    sendTestEmail: vi.fn().mockResolvedValue({}),
  })),
}));

import { Booking } from "@/models/Booking";
import { Product } from "@/models/Product";
import { createMailAdapter } from "@/lib/providers/mail";
import {
  dispatchBookingReminders,
  isReminderSecret,
  type BookingReminderOutcome,
} from "@/lib/services/reminder-service";

const mockFind = vi.mocked(Booking.find);
const mockUpdateOne = vi.mocked(Booking.updateOne);
const mockFindById = vi.mocked(Product.findById);
const mockMail = vi.mocked(createMailAdapter);
const mockSendTemplateEmail = vi.fn().mockResolvedValue({});

function leanChain(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    _id: "BK1",
    customerEmail: "buyer@example.com",
    customerName: "Buyer Person",
    timezone: "Africa/Lagos",
    scheduledStartTime: new Date("2026-09-15T10:00:00.000Z"),
    meetingUrl: "https://meet.google.com/abc-def-ghi",
    productId: "PROD1",
    reminders: [],
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("dispatchBookingReminders", () => {
  it("sends the 24h reminder when the 24h threshold is crossed and marks it sent", async () => {
    mockMail.mockReturnValue({
      sendTemplateEmail: mockSendTemplateEmail.mockResolvedValue({}),
      sendEmail: vi.fn().mockResolvedValue({}),
      sendTestEmail: vi.fn().mockResolvedValue({}),
    });
    const in24hPlus = new Date(Date.now() + 2 * 60 * 60 * 1000);
    mockFind.mockImplementation(() =>
      leanChain([makeBooking({ scheduledStartTime: in24hPlus })])
    );
    mockFindById.mockImplementation(() => leanChain({ title: "90-Min Session" }));

    const result = await dispatchBookingReminders();

    expect(mockSendTemplateEmail).toHaveBeenCalledTimes(1);
    const call = mockSendTemplateEmail.mock.calls[0][0];
    expect(call.templateKey).toBe("booking_reminder");
    expect(call.variables.windowHours).toBe("24");
    expect(call.variables.meetingUrl).toBe("https://meet.google.com/abc-def-ghi");
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: "BK1" },
      {
        $push: {
          reminders: expect.objectContaining({ point: "24h" }),
        },
      }
    );
    expect(result.dispatched).toHaveLength(1);
    expect(result.dispatched[0]).toMatchObject({
      bookingId: "BK1",
      point: "24h",
      sentTo: "buyer@example.com",
    } satisfies BookingReminderOutcome);
  });

  it("sends the 1h reminder for a booking crossing the 1h threshold", async () => {
    mockMail.mockReturnValue({
      sendTemplateEmail: mockSendTemplateEmail.mockResolvedValue({}),
      sendEmail: vi.fn().mockResolvedValue({}),
      sendTestEmail: vi.fn().mockResolvedValue({}),
    });
    const in1hPlus = new Date(Date.now() + 10 * 60 * 1000);
    mockFind.mockImplementation(() =>
      leanChain([
        makeBooking({
          scheduledStartTime: in1hPlus,
          reminders: [{ point: "24h", sentAt: new Date() }],
        }),
      ])
    );
    mockFindById.mockImplementation(() => leanChain({ title: "90-Min Session" }));

    const result = await dispatchBookingReminders();

    expect(mockSendTemplateEmail).toHaveBeenCalledTimes(1);
    const call = mockSendTemplateEmail.mock.calls[0][0];
    expect(call.variables.windowHours).toBe("1");
    expect(result.dispatched[0].point).toBe("1h");
  });

  it("does not send a reminder before the threshold is crossed", async () => {
    mockMail.mockReturnValue({
      sendTemplateEmail: mockSendTemplateEmail.mockResolvedValue({}),
      sendEmail: vi.fn().mockResolvedValue({}),
      sendTestEmail: vi.fn().mockResolvedValue({}),
    });
    const in30h = new Date(Date.now() + 30 * 60 * 60 * 1000);
    mockFind.mockImplementation(() =>
      leanChain([makeBooking({ scheduledStartTime: in30h })])
    );

    const result = await dispatchBookingReminders();

    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
    expect(mockUpdateOne).not.toHaveBeenCalled();
    expect(result.dispatched).toHaveLength(0);
  });

  it("does not resend a reminder point that was already sent", async () => {
    mockMail.mockReturnValue({
      sendTemplateEmail: mockSendTemplateEmail.mockResolvedValue({}),
      sendEmail: vi.fn().mockResolvedValue({}),
      sendTestEmail: vi.fn().mockResolvedValue({}),
    });
    const in1hPlus = new Date(Date.now() + 10 * 60 * 1000);
    mockFind.mockImplementation(() =>
      leanChain([
        makeBooking({
          scheduledStartTime: in1hPlus,
          reminders: [
            { point: "24h", sentAt: new Date() },
            { point: "1h", sentAt: new Date() },
          ],
        }),
      ])
    );

    const result = await dispatchBookingReminders();

    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
    expect(mockUpdateOne).not.toHaveBeenCalled();
    expect(result.dispatched).toHaveLength(0);
  });

  it("does not send reminders for bookings without a future start time (skipped)", async () => {
    mockMail.mockReturnValue({
      sendTemplateEmail: mockSendTemplateEmail.mockResolvedValue({}),
      sendEmail: vi.fn().mockResolvedValue({}),
      sendTestEmail: vi.fn().mockResolvedValue({}),
    });
    const past = new Date(Date.now() - 60 * 60 * 1000);
    mockFind.mockImplementation(() =>
      leanChain([makeBooking({ scheduledStartTime: past })])
    );

    const result = await dispatchBookingReminders();

    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
    expect(result.dispatched).toHaveLength(0);
    expect(result.skipped).toBeGreaterThan(0);
  });

  it("records a skipped reminder when email sending throws", async () => {
    mockMail.mockReturnValue({
      sendTemplateEmail: vi.fn().mockRejectedValue(new Error("smtp down")),
      sendEmail: vi.fn().mockResolvedValue({}),
      sendTestEmail: vi.fn().mockResolvedValue({}),
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const in1hPlus = new Date(Date.now() + 10 * 60 * 1000);
    mockFind.mockImplementation(() =>
      leanChain([makeBooking({ scheduledStartTime: in1hPlus })])
    );

    const result = await dispatchBookingReminders();

    expect(result.dispatched).toHaveLength(0);
    expect(result.skipped).toBeGreaterThan(0);
    expect(mockUpdateOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ _id: "BK1" }),
      expect.objectContaining({ $push: expect.anything() })
    );
    errorSpy.mockRestore();
  });
});

describe("isReminderSecret", () => {
  it("matches the configured secret exactly", () => {
    expect(isReminderSecret("unit-test-reminder-secret")).toBe(true);
    expect(isReminderSecret("wrong")).toBe(false);
    expect(isReminderSecret("")).toBe(false);
  });
});

describe("buildTemplate → booking_reminder", () => {
  it("renders a 24h reminder email via the mail adapter template path", async () => {
    mockMail.mockReturnValue({
      sendTemplateEmail: mockSendTemplateEmail.mockResolvedValue({}),
      sendEmail: vi.fn().mockResolvedValue({}),
      sendTestEmail: vi.fn().mockResolvedValue({}),
    });
    const in24h = new Date(Date.now() + 23 * 60 * 60 * 1000);
    mockFind.mockImplementation(() =>
      leanChain([makeBooking({ scheduledStartTime: in24h })])
    );
    mockFindById.mockImplementation(() => leanChain({ title: "90-Min Session" }));

    await dispatchBookingReminders();

    const call = mockSendTemplateEmail.mock.calls[0][0];
    expect(call.to).toBe("buyer@example.com");
    expect(call.variables.itemTitle).toBe("90-Min Session");
    expect(call.variables.customerName).toBe("Buyer Person");
  });
});