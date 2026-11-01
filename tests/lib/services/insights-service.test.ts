import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Order", () => ({
  Order: { countDocuments: vi.fn(), aggregate: vi.fn(), find: vi.fn() },
}));
vi.mock("@/models/Fulfillment", () => ({
  Fulfillment: { aggregate: vi.fn() },
}));
vi.mock("@/models/User", () => ({
  User: { countDocuments: vi.fn() },
}));
vi.mock("@/models/Payment", () => ({
  Payment: { aggregate: vi.fn() },
}));
vi.mock("@/models/Booking", () => ({
  Booking: { countDocuments: vi.fn() },
}));

import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { getInsights } from "@/lib/services/insights-service";

type MockFn = ReturnType<typeof vi.fn>;

const mockOrderCount = Order.countDocuments as unknown as MockFn;
const mockOrderAggregate = Order.aggregate as unknown as MockFn;
const mockOrderFind = Order.find as unknown as MockFn;
const mockFulfillmentAggregate = Fulfillment.aggregate as unknown as MockFn;
const mockUserCount = User.countDocuments as unknown as MockFn;
const mockPaymentAggregate = Payment.aggregate as unknown as MockFn;
const mockBookingCount = Booking.countDocuments as unknown as MockFn;

const NOW = new Date("2026-09-04T12:00:00.000Z");

interface AggregateStage {
  $match?: Record<string, unknown>;
  $unwind?: unknown;
  $group?: { _id: unknown };
  $lookup?: { from: string };
  $count?: string;
  $limit?: number;
  $project?: Record<string, unknown>;
  $sort?: unknown;
}

function findChain<T>(resolve: T) {
  return {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(resolve),
  };
}

function mockOrderAggregateDefault() {
  mockOrderAggregate.mockImplementation((pipeline: AggregateStage[]) => {
    if (pipeline.some((stage) => stage.$unwind)) {
      return Promise.resolve([] as never[]);
    }
    const group = pipeline.find((stage) => stage.$group);
    const id = group?.$group?._id;
    if (typeof id === "string") {
      return Promise.resolve([{ _id: "PAID", count: 8 }] as never[]);
    }
    if (id && typeof id === "object" && "$dateTrunc" in id) {
      return Promise.resolve([
        {
          _id: new Date("2026-09-01T00:00:00.000Z"),
          revenueMinor: 500_000_00,
          orders: 3,
        },
      ] as never[]);
    }
    return Promise.resolve([{ _id: null, revenueMinor: 1_200_000_00 }] as never[]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  mockOrderCount.mockImplementation((f: Record<string, unknown>) => {
    if (f.status === "PAID") return Promise.resolve(8);
    if (f.createdAt) return Promise.resolve(12);
    return Promise.resolve(0);
  });

  mockUserCount.mockImplementation(() => Promise.resolve(4));

  mockBookingCount.mockImplementation((f: Record<string, unknown>) => {
    if (f.status === "PENDING") return Promise.resolve(2);
    const inList = (f.status as { $in?: string[] } | undefined)?.$in;
    if (inList) return Promise.resolve(3);
    return Promise.resolve(0);
  });

  mockOrderAggregateDefault();

  // Fulfillment reads now go through aggregates so orphaned rows (whose order
  // no longer exists) can be dropped by the pipeline's $lookup.
  mockFulfillmentAggregate.mockImplementation((pipeline: AggregateStage[]) => {
    const match = pipeline.find((stage) => stage.$match)?.$match;
    const status = match?.status as
      | string
      | { $in?: string[] }
      | undefined;

    if (pipeline.some((stage) => stage.$limit === 8)) {
      return Promise.resolve([
        {
          _id: "f1",
          orderId: "o1",
          status: "FULFILLED",
          fulfilledAt: new Date("2026-09-03T10:00:00.000Z"),
        },
      ] as never[]);
    }

    if (pipeline.some((stage) => stage.$count)) {
      if (match?.type) {
        if (status === "FULFILLED") return Promise.resolve([{ count: 5 }]);
        const inList = (status as { $in?: string[] } | undefined)?.$in;
        if (inList) {
          return Promise.resolve([
            { count: inList[0] === "PENDING" ? 1 : 2 },
          ]);
        }
      }
      // Fulfillment issues are counted across every fulfillment type.
      return Promise.resolve([{ count: 3 }]);
    }

    return Promise.resolve([
      {
        _id: new Date("2026-09-01T00:00:00.000Z"),
        enrollments: 2,
      },
    ] as never[]);
  });

  mockPaymentAggregate.mockImplementation((pipeline: AggregateStage[]) => {
    const status = pipeline.find((stage) => stage.$match)?.$match?.status as
      | { $in?: string[] }
      | undefined;
    const inList = status?.$in;
    return Promise.resolve([
      { count: inList?.[0] === "FAILED" ? 1 : 2 },
    ]);
  });

  mockOrderFind.mockImplementation(() =>
    findChain([
      {
        _id: "o1",
        orderReference: "QL-000001",
        customerEmail: "a@test.com",
        items: [{ titleSnapshot: "Course A" }],
      },
    ])
  );
});

describe("getInsights", () => {
  it("defaults to monthly and builds 12 buckets", async () => {
    const snapshot = await getInsights(undefined, { now: NOW });
    expect(snapshot.period).toBe("monthly");
    expect(snapshot.trend).toHaveLength(12);
    expect(snapshot.trend[0].label).toBe("Oct");
    expect(snapshot.trend[11].label).toBe("Sep");
  });

  it("supports daily periods with 30 buckets", async () => {
    const snapshot = await getInsights("daily", { now: NOW });
    expect(snapshot.period).toBe("daily");
    expect(snapshot.trend).toHaveLength(30);
  });

  it("builds a daily trend for a custom range", async () => {
    const snapshot = await getInsights(
      { window: "custom", start: "2026-06-01", end: "2026-06-30" },
      { now: NOW }
    );

    expect(snapshot.period).toBe("custom");
    expect(snapshot.rangeStart).toBe("2026-06-01");
    expect(snapshot.rangeEnd).toBe("2026-06-30");
    expect(snapshot.windowDescription).toBe("Jun 1, 2026 – Jun 30, 2026");
    expect(snapshot.windowStart).toBe("2026-06-01T00:00:00.000Z");
    expect(snapshot.trend).toHaveLength(30);
    expect(snapshot.trend[0].label).toBe("Jun 01");
    expect(snapshot.trend[29].label).toBe("Jun 30");
  });

  it("coarsens buckets for long custom ranges", async () => {
    const weekly = await getInsights(
      { window: "custom", start: "2026-01-01", end: "2026-03-31" },
      { now: NOW }
    );
    // 90 days → weekly buckets starting on the Monday of the first week.
    expect(weekly.period).toBe("custom");
    expect(weekly.trend[0].label).toBe("w/c Dec 29");
    expect(weekly.trend).toHaveLength(14);

    const monthly = await getInsights(
      { window: "custom", start: "2025-01-01", end: "2026-06-30" },
      { now: NOW }
    );
    expect(monthly.period).toBe("custom");
    expect(monthly.trend[0].label).toBe("Jan");
    expect(monthly.trend).toHaveLength(18);
  });

  it("applies an exclusive upper bound to every period query", async () => {
    await getInsights(
      { window: "custom", start: "2026-06-01", end: "2026-06-30" },
      { now: NOW }
    );

    const expected = {
      $gte: new Date("2026-06-01T00:00:00.000Z"),
      $lt: new Date("2026-07-01T00:00:00.000Z"),
    };

    expect(mockOrderCount).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: expected })
    );
    expect(mockOrderCount).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PAID", paidAt: expected })
    );
    expect(mockUserCount).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: expected })
    );

    const paidProductPipeline = mockOrderAggregate.mock.calls
      .map((call) => call[0] as AggregateStage[])
      .find((pipeline) => pipeline.some((stage) => stage.$unwind));
    expect(paidProductPipeline?.[0]?.$match).toMatchObject({
      status: "PAID",
      paidAt: expected,
    });
  });

  it("uses the coarse bucket unit for custom aggregation truncation", async () => {
    await getInsights(
      { window: "custom", start: "2026-01-01", end: "2026-03-31" },
      { now: NOW }
    );

    const trendPipelines = mockOrderAggregate.mock.calls
      .map((call) => call[0] as AggregateStage[])
      .filter((pipeline) =>
        pipeline.some(
          (stage) =>
            stage.$group &&
            typeof stage.$group._id === "object" &&
            stage.$group._id !== null &&
            "$dateTrunc" in (stage.$group._id as Record<string, unknown>)
        )
      );

    expect(trendPipelines.length).toBeGreaterThan(0);
    for (const pipeline of trendPipelines) {
      const group = pipeline.find((stage) => stage.$group)?.$group;
      expect(
        (group?._id as { $dateTrunc: { unit: string } }).$dateTrunc.unit
      ).toBe("week");
    }
  });

  it("falls back to monthly for an invalid custom range", async () => {
    const snapshot = await getInsights(
      { window: "custom", start: "not-a-date", end: "2026-06-30" },
      { now: NOW }
    );

    expect(snapshot.period).toBe("monthly");
    expect(snapshot.rangeStart).toBeUndefined();
    expect(snapshot.rangeEnd).toBeUndefined();
    expect(snapshot.windowDescription).toBe("Last 12 months");
    expect(snapshot.trend).toHaveLength(12);
  });

  it("computes KPIs for the window", async () => {
    const snapshot = await getInsights("monthly", { now: NOW });

    expect(snapshot.kpis).toEqual({
      revenueMinor: 1_200_000_00,
      paidOrders: 8,
      ordersCreated: 12,
      conversionRate: 67,
      averageOrderMinor: 150_000_00,
      newCustomers: 4,
      enrollments: 5,
      enrollmentPending: 1,
      enrollmentIssues: 2,
    });
  });

  it("maps aggregation buckets into the trend and fills missing buckets with zeros", async () => {
    const snapshot = await getInsights("monthly", { now: NOW });

    const september = snapshot.trend.find((t) => t.label === "Sep");
    expect(september?.revenueMinor).toBe(500_000_00);
    expect(september?.orders).toBe(3);
    expect(september?.enrollments).toBe(2);

    const november = snapshot.trend.find((t) => t.label === "Nov");
    expect(november?.revenueMinor).toBe(0);
    expect(november?.orders).toBe(0);
    expect(november?.enrollments).toBe(0);
  });

  it("returns products by revenue and orders by status", async () => {
    mockOrderAggregate.mockImplementation((pipeline: AggregateStage[]) => {
      if (pipeline.some((stage) => stage.$unwind)) {
        return Promise.resolve([
          {
            _id: "p1",
            title: "AI Course",
            type: "COURSE",
            orders: 5,
            revenueMinor: 500_000_00,
          },
        ] as never[]);
      }
      const group = pipeline.find((stage) => stage.$group);
      if (typeof group?.$group?._id === "string") {
        return Promise.resolve([{ _id: "PAID", count: 8 }] as never[]);
      }
      return Promise.resolve([{ _id: null, revenueMinor: 0 }] as never[]);
    });

    const snapshot = await getInsights("monthly", { now: NOW });

    expect(snapshot.productsByRevenue).toHaveLength(1);
    expect(snapshot.productsByRevenue[0]).toMatchObject({
      productId: "p1",
      title: "AI Course",
      type: "COURSE",
      revenueMinor: 500_000_00,
    });
    expect(snapshot.ordersByStatus).toEqual([{ status: "PAID", count: 8 }]);
  });

  it("joins recent enrollments with order details", async () => {
    const snapshot = await getInsights("monthly", { now: NOW });

    expect(snapshot.recentEnrollments).toHaveLength(1);
    expect(snapshot.recentEnrollments[0]).toMatchObject({
      courseTitle: "Course A",
      customerEmail: "a@test.com",
      orderReference: "QL-000001",
      status: "FULFILLED",
    });
    expect(snapshot.recentEnrollments[0].fulfilledAt).toContain("2026-09-03");
  });

  it("reports operations counts", async () => {
    const snapshot = await getInsights("monthly", { now: NOW });

    expect(snapshot.operations).toEqual({
      fulfillmentIssues: 3,
      pendingPayments: 2,
      failedPayments: 1,
      pendingBookings: 2,
      upcomingBookings: 3,
    });
  });

  it("drops fulfillment and payment rows whose order no longer exists", async () => {
    await getInsights("monthly", { now: NOW });

    const pipelines: AggregateStage[][] = [
      ...mockFulfillmentAggregate.mock.calls.map((call) => call[0]),
      ...mockPaymentAggregate.mock.calls.map((call) => call[0]),
    ];

    expect(pipelines.length).toBeGreaterThan(0);

    for (const pipeline of pipelines) {
      const lookupIndex = pipeline.findIndex(
        (stage) => stage.$lookup?.from === "orders"
      );
      expect(lookupIndex).toBeGreaterThanOrEqual(0);
      expect(pipeline[lookupIndex + 1]?.$match).toHaveProperty(
        "__liveOrder.0"
      );

      // The join has to run before any stage that consumes or drops orderId.
      const groupOrCount = pipeline.findIndex(
        (stage) => stage.$group || stage.$count
      );
      if (groupOrCount >= 0) expect(lookupIndex).toBeLessThan(groupOrCount);
    }
  });
});