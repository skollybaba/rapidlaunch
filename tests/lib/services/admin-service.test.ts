import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Booking", () => ({
  Booking: {
    find: vi.fn(),
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock("@/models/Fulfillment", () => ({}));
vi.mock("@/models/Order", () => ({}));
vi.mock("@/models/Payment", () => ({}));

vi.mock("@/models/Product", () => ({
  Product: { find: vi.fn() },
}));

vi.mock("@/models/User", () => ({}));

import { Booking } from "@/models/Booking";
import { Product } from "@/models/Product";
import { getAdminBookings } from "@/lib/services/admin-service";

const mockAggregate = vi.mocked(Booking.aggregate);
const mockCount = vi.mocked(Booking.countDocuments);
const mockProductFind = vi.mocked(Product.find);

function productChain(value: unknown) {
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

  it("applies no time filter by default", async () => {
    await getAdminBookings();

    expect(mockCount).toHaveBeenCalledWith({});
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