import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Order", () => ({
  Order: { find: vi.fn() },
}));

vi.mock("@/models/Booking", () => ({
  Booking: { find: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn() },
}));

vi.mock("@/models/Product", () => ({
  Product: { find: vi.fn(), findById: vi.fn() },
}));

vi.mock("@/models/Fulfillment", () => ({}));

const envMocks = vi.hoisted(() => ({
  env: {
    ADMIN_EMAILS: "owner@example.com",
    MAIL_FROM_EMAIL: "owner@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

vi.mock("@/lib/env", () => ({ env: envMocks.env }));

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

import { Booking } from "@/models/Booking";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import {
  AccountServiceError,
  RESCHEDULE_WINDOW_MS,
  getSessionsForUser,
  requestSessionReschedule,
} from "@/lib/services/account-service";

const mockOrderFind = vi.mocked(Order.find);
const mockBookingFind = vi.mocked(Booking.find);
const mockBookingFindOne = vi.mocked(Booking.findOne);
const mockBookingFindOneAndUpdate = vi.mocked(Booking.findOneAndUpdate);
const mockProductFind = vi.mocked(Product.find);
const mockProductFindById = vi.mocked(Product.findById);
const mockSendTemplateEmail = vi.mocked(mailMocks.sendTemplateEmail);

function orderFindChain(value: unknown) {
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

function bookingUpdateChain(value: unknown) {
  return {
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function productByIdChain(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return { _id: "ORD1", orderReference: "QL-1001", userId: "U1", ...overrides };
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    _id: "BK1",
    orderId: "ORD1",
    productId: "PROD1",
    customerEmail: "buyer@example.com",
    customerName: "Buyer Person",
    status: "CONFIRMED",
    scheduledStartTime: new Date(),
    rescheduleRequestedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrderFind.mockReset();
  mockBookingFind.mockReset();
  mockBookingFindOne.mockReset();
  mockBookingFindOneAndUpdate.mockReset();
  mockProductFind.mockReset();
  mockProductFindById.mockReset();
  envMocks.env.ADMIN_EMAILS = "owner@example.com";
  envMocks.env.MAIL_FROM_EMAIL = "owner@example.com";
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSessionsForUser", () => {
  beforeEach(() => {
    mockOrderFind.mockReturnValue(orderFindChain([makeOrder()]));
    mockProductFind.mockReturnValue(
      productByIdChain([{ _id: "PROD1", title: "Consultation" }])
    );
  });

  it("marks a session as reschedulable when it is more than 24 hours away", async () => {
    mockBookingFind.mockReturnValue(
      bookingFindChain([
        makeBooking({
          scheduledStartTime: new Date(Date.now() + RESCHEDULE_WINDOW_MS + 60_000),
        }),
      ])
    );

    const sessions = await getSessionsForUser("U1");
    expect(sessions[0].rescheduleAvailable).toBe(true);
    expect(sessions[0].rescheduleRequestedAt).toBeNull();
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

  it("does not allow rescheduling when a request is already in progress", async () => {
    mockBookingFind.mockReturnValue(
      bookingFindChain([
        makeBooking({
          scheduledStartTime: new Date(Date.now() + RESCHEDULE_WINDOW_MS + 60_000),
          rescheduleRequestedAt: new Date(),
        }),
      ])
    );

    const sessions = await getSessionsForUser("U1");
    expect(sessions[0].rescheduleAvailable).toBe(false);
    expect(sessions[0].rescheduleRequestedAt).not.toBeNull();
  });

  it("does not allow rescheduling cancelled or failed sessions", async () => {
    mockBookingFind.mockReturnValue(
      bookingFindChain([
        makeBooking({
          status: "CANCELLED",
          scheduledStartTime: new Date(Date.now() + RESCHEDULE_WINDOW_MS + 60_000),
        }),
      ])
    );

    const sessions = await getSessionsForUser("U1");
    expect(sessions[0].rescheduleAvailable).toBe(false);
  });
});

describe("requestSessionReschedule", () => {
  const upcomingBooking = () =>
    makeBooking({
      scheduledStartTime: new Date(Date.now() + RESCHEDULE_WINDOW_MS + 60_000),
    });

  it("records the reschedule request and notifies the owner", async () => {
    mockOrderFind.mockReturnValue(orderFindChain([makeOrder()]));
    mockBookingFindOne.mockReturnValue(bookingFindOneChain(upcomingBooking()));
    mockBookingFindOneAndUpdate.mockReturnValue(bookingUpdateChain(null));
    mockProductFindById.mockReturnValue(productByIdChain({ _id: "PROD1", title: "Consultation" }));

    const result = await requestSessionReschedule("BK1", "U1");

    expect(result).toEqual({ id: "BK1" });
    expect(mockBookingFindOne).toHaveBeenCalledWith({
      _id: "BK1",
      orderId: { $in: ["ORD1"] },
    });
    expect(mockBookingFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "BK1" },
      { $set: { rescheduleRequestedAt: expect.any(Date) } }
    );
    expect(mockSendTemplateEmail).toHaveBeenCalledWith({
      templateKey: "booking_reschedule_request",
      to: "owner@example.com",
      variables: expect.objectContaining({
        customerEmail: "buyer@example.com",
        itemTitle: "Consultation",
        orderReference: "QL-1001",
      }),
    });
  });

  it("rejects sessions that do not belong to the user", async () => {
    mockOrderFind.mockReturnValue(orderFindChain([makeOrder()]));
    mockBookingFindOne.mockReturnValue(bookingFindOneChain(null));

    await expect(requestSessionReschedule("BK99", "U1")).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
      status: 404,
    });
    expect(mockBookingFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects requests within 24 hours of the start time", async () => {
    mockOrderFind.mockReturnValue(orderFindChain([makeOrder()]));
    mockBookingFindOne.mockReturnValue(
      bookingFindOneChain(
        makeBooking({
          scheduledStartTime: new Date(Date.now() + RESCHEDULE_WINDOW_MS),
        })
      )
    );

    await expect(requestSessionReschedule("BK1", "U1")).rejects.toMatchObject({
      code: "RESCHEDULE_NOT_AVAILABLE",
    });
    expect(mockBookingFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
  });

  it("rejects sessions with no scheduled start time", async () => {
    mockOrderFind.mockReturnValue(orderFindChain([makeOrder()]));
    mockBookingFindOne.mockReturnValue(
      bookingFindOneChain(makeBooking({ scheduledStartTime: null }))
    );

    await expect(requestSessionReschedule("BK1", "U1")).rejects.toMatchObject({
      code: "RESCHEDULE_NOT_AVAILABLE",
    });
  });

  it("rejects duplicate reschedule requests", async () => {
    mockOrderFind.mockReturnValue(orderFindChain([makeOrder()]));
    mockBookingFindOne.mockReturnValue(
      bookingFindOneChain(
        makeBooking({
          scheduledStartTime: new Date(Date.now() + RESCHEDULE_WINDOW_MS + 60_000),
          rescheduleRequestedAt: new Date(),
        })
      )
    );

    await expect(requestSessionReschedule("BK1", "U1")).rejects.toMatchObject({
      code: "RESCHEDULE_ALREADY_REQUESTED",
      status: 409,
    });
    expect(mockBookingFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects cancelled sessions", async () => {
    mockOrderFind.mockReturnValue(orderFindChain([makeOrder()]));
    mockBookingFindOne.mockReturnValue(
      bookingFindOneChain(
        makeBooking({
          status: "CANCELLED",
          scheduledStartTime: new Date(Date.now() + RESCHEDULE_WINDOW_MS + 60_000),
        })
      )
    );

    await expect(requestSessionReschedule("BK1", "U1")).rejects.toMatchObject({
      code: "SESSION_NOT_ACTIVE",
      status: 409,
    });
    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
  });

  it("still records the request when no owner email is configured", async () => {
    envMocks.env.ADMIN_EMAILS = "";
    envMocks.env.MAIL_FROM_EMAIL = "";
    mockOrderFind.mockReturnValue(orderFindChain([makeOrder()]));
    mockBookingFindOne.mockReturnValue(bookingFindOneChain(upcomingBooking()));
    mockBookingFindOneAndUpdate.mockReturnValue(bookingUpdateChain(null));
    mockProductFindById.mockReturnValue(productByIdChain(null));

    const result = await requestSessionReschedule("BK1", "U1");
    expect(result).toEqual({ id: "BK1" });
    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
  });

  it("surfaces AccountServiceError instances for the API handler", () => {
    const error = new AccountServiceError("SESSION_NOT_FOUND", "Session not found.", 404);
    expect(error.status).toBe(404);
    expect(error.code).toBe("SESSION_NOT_FOUND");
    expect(error).toBeInstanceOf(Error);
  });
});