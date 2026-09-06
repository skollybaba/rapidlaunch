import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Booking", () => ({
  Booking: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock("@/models/Fulfillment", () => ({}));
vi.mock("@/models/Order", () => ({
  Order: { find: vi.fn() },
}));
vi.mock("@/models/Payment", () => ({
  Payment: { find: vi.fn() },
}));

vi.mock("@/models/Product", () => ({
  Product: { find: vi.fn() },
}));

vi.mock("@/models/User", () => ({}));

import { Booking } from "@/models/Booking";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import {
  dismissBooking,
  getAdminBookings,
  getNextUpcomingSession,
} from "@/lib/services/admin-service";

const mockAggregate = vi.mocked(Booking.aggregate);
const mockCount = vi.mocked(Booking.countDocuments);
const mockFindOne = vi.mocked(Booking.findOne);
const mockFindOneAndUpdate = vi.mocked(Booking.findOneAndUpdate);
const mockProductFind = vi.mocked(Product.find);
const mockOrderFind = vi.mocked(Order.find);
const mockPaymentFind = vi.mocked(Payment.find);

function productChain(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function findOneChain(value: unknown) {
  return {
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    _id: "BK1",
    orderId: "ORD1",
    customerEmail: "buyer@example.com",
    customerName: "Buyer Person",
    timezone: "Africa/Lagos",
    scheduledStartTime: new Date("2026-09-15T10:00:00.000Z"),
    scheduledEndTime: new Date("2026-09-15T10:30:00.000Z"),
    requestedStartTime: new Date("2026-09-14T09:00:00.000Z"),
    meetingUrl: "https://meet.google.com/abc-def-ghi",
    providerEventUri: "https://calendar.google.com/event?eid=1",
    schedulingUrl: "https://calendar.google.com/schedule",
    productId: "PROD1",
    answers: {
      whatYouAreBuilding: "A booking scheduler",
      currentStage: "Prototype",
      helpNeeded: "Pricing strategy",
    },
    status: "PENDING",
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  mockCount.mockResolvedValue(1);
  mockAggregate.mockResolvedValue([makeBooking()] as never);
  mockProductFind.mockImplementation(() =>
    productChain([{ _id: "PROD1", title: "90-Min Session" }])
  );
  mockFindOne.mockImplementation(() =>
    findOneChain(makeBooking({ status: "CONFIRMED" }))
  );
  mockOrderFind.mockImplementation(() =>
    productChain([
      {
        _id: "ORD1",
        status: "PAID",
        orderReference: "QL-ORD1",
      },
    ])
  );
  mockPaymentFind.mockImplementation(() =>
    productChain([
      {
        orderId: "ORD1",
        providerReference: "PL-REF-001",
        status: "PAID",
      },
    ])
  );
  mockFindOneAndUpdate.mockImplementation(() =>
    productChain({
      _id: "BK1",
      orderId: "ORD1",
      status: "PENDING",
      dismissedAt: new Date("2026-09-06T10:00:00.000Z"),
    })
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getAdminBookings", () => {
  it("returns booking rows with answers, meeting, and scheduling details", async () => {
    const result = await getAdminBookings({ pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.rows[0]).toMatchObject({
      id: "BK1",
      customerName: "Buyer Person",
      customerEmail: "buyer@example.com",
      productTitle: "90-Min Session",
      status: "PENDING",
      meetingUrl: "https://meet.google.com/abc-def-ghi",
      providerEventUri: "https://calendar.google.com/event?eid=1",
      schedulingUrl: "https://calendar.google.com/schedule",
      timezone: "Africa/Lagos",
      answers: {
        whatYouAreBuilding: "A booking scheduler",
        currentStage: "Prototype",
        helpNeeded: "Pricing strategy",
      },
    });
    expect(result.rows[0].requestedStartTime).toBe(
      "2026-09-14T09:00:00.000Z"
    );
    expect(result.rows[0].scheduledStartTime).toBe("2026-09-15T10:00:00.000Z");
    expect(result.rows[0]).toMatchObject({
      orderReference: "QL-ORD1",
      orderStatus: "PAID",
      paymentReference: "PL-REF-001",
      paymentStatus: "PAID",
    });
  });

  it("excludes dismissed bookings by default", async () => {
    await getAdminBookings();

    expect(mockCount).toHaveBeenCalledWith({ dismissedAt: null });
    expect(mockAggregate.mock.calls[0][0][0]).toEqual({
      $match: { dismissedAt: null },
    });
  });

  it("applies status and range filters alongside the dismissed exclusion", async () => {
    await getAdminBookings({ status: "PENDING", range: "next7" });

    const filter = mockCount.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(filter.dismissedAt).toBeNull();
    expect(filter.status).toBe("PENDING");
    expect(filter.scheduledStartTime).toBeDefined();
  });

  it("omits answers and requested times when the booking has none", async () => {
    mockAggregate.mockResolvedValue([
      makeBooking({
        answers: undefined,
        requestedStartTime: null,
        meetingUrl: undefined,
        providerEventUri: undefined,
      }),
    ] as never);

    const result = await getAdminBookings();

    expect(result.rows[0].answers).toBeUndefined();
    expect(result.rows[0].requestedStartTime).toBeNull();
    expect(result.rows[0].meetingUrl).toBeUndefined();
  });

  it("applies no time filter by default beyond dismissed", async () => {
    await getAdminBookings();

    const filter = mockCount.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(filter).toEqual({ dismissedAt: null });
  });

  it.each([
    ["upcoming", 1],
    ["past", 2],
    ["next7", 7],
    ["next30", 30],
    ["next365", 365],
  ] as const)(
    "sorts %s so upcoming bookings appear soonest-first with undated last",
    async (range, days) => {
      await getAdminBookings({ range });

      if (days === 1) {
        const filter = mockCount.mock.calls[0][0] as unknown as Record<
          string,
          unknown
        >;
        expect(filter.$or).toEqual([
          { scheduledStartTime: null },
          { scheduledStartTime: { $gte: expect.any(Date) } },
        ]);
      }

      const pipeline = mockAggregate.mock.calls[0][0] as unknown as Record<
        string,
        unknown
      >[];
      const addFields = pipeline.find(
        (stage) => "$addFields" in stage
      ) as { $addFields: Record<string, unknown> };
      const sort = pipeline.find((stage) => "$sort" in stage) as {
        $sort: Record<string, unknown>;
      };

      expect(addFields).toBeDefined();
      expect(addFields.$addFields.__sortKey).toBeDefined();
      expect(sort.$sort).toEqual({ __sortKey: 1, createdAt: -1 });
    }
  );

  it("combines status with the range filter", async () => {
    await getAdminBookings({ status: "CONFIRMED", range: "past" });

    const filter = mockCount.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(filter.status).toBe("CONFIRMED");
    expect(filter.scheduledStartTime).toEqual({ $lt: expect.any(Date) });
  });

  it("sorts by most recently booked when sort is recent", async () => {
    await getAdminBookings({ sort: "recent" });

    const pipeline = mockAggregate.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >[];
    const addFields = pipeline.find(
      (stage) => "$addFields" in stage
    ) as { $addFields: Record<string, unknown> } | undefined;
    const sortStage = pipeline.find((stage) => "$sort" in stage) as {
      $sort: Record<string, unknown>;
    };

    expect(addFields).toBeUndefined();
    expect(sortStage.$sort).toEqual({ createdAt: -1, _id: -1 });
  });

  it("filters upcoming to future and undated bookings", async () => {
    await getAdminBookings({ range: "upcoming" });

    const filter = mockCount.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(filter.$or).toEqual([
      { scheduledStartTime: null },
      { scheduledStartTime: { $gte: expect.any(Date) } },
    ]);
  });

  it("filters past bookings to those before now", async () => {
    const before = Date.now();
    await getAdminBookings({ range: "past" });

    const filter = mockCount.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    const rule = filter.scheduledStartTime as { $lt: Date };
    expect(rule.$lt).toBeInstanceOf(Date);
    expect(rule.$lt.getTime()).toBeLessThanOrEqual(before);
  });

  it.each([
    ["next7", 7],
    ["next30", 30],
    ["next365", 365],
  ] as const)(
    "filters %s to the matching forward window",
    async (range, days) => {
      const before = Date.now();
      await getAdminBookings({ range });

      const filter = mockCount.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
      const rule = filter.scheduledStartTime as { $gte: Date; $lte: Date };
      expect(rule.$gte.getTime()).toBeCloseTo(before, -3);
      expect(rule.$lte.getTime() - rule.$gte.getTime()).toBe(
        days * 86_400_000
      );
    }
  );
});

describe("getNextUpcomingSession", () => {
  it("returns the next upcoming session with product and customer details", async () => {
    const result = await getNextUpcomingSession();

    expect(mockFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        status: { $in: ["CONFIRMED", "PENDING"] },
      })
    );
    expect(result.session).toMatchObject({
      id: "BK1",
      productTitle: "90-Min Session",
      customerEmail: "buyer@example.com",
      customerName: "Buyer Person",
      status: "CONFIRMED",
    });
    expect(result.session?.scheduledStartTime).toBe("2026-09-15T10:00:00.000Z");
  });

  it("returns no session when there are no upcoming bookings", async () => {
    mockFindOne.mockImplementation(() => findOneChain(null));

    await expect(getNextUpcomingSession()).resolves.toEqual({ session: null });
  });
});

describe("dismissBooking", () => {
  it("marks a booking as dismissed", async () => {
    const result = await dismissBooking("BK1");

    expect(Booking.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "BK1" },
      { $set: { dismissedAt: expect.any(Date) } },
      { new: true }
    );
    expect(result).toEqual({ id: "BK1" });
  });

  it("throws when the booking does not exist", async () => {
    mockFindOneAndUpdate.mockImplementation(() => productChain(null));

    await expect(dismissBooking("NOPE")).rejects.toThrow("Booking not found");
  });
});