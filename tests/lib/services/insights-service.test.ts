import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Order", () => ({
  Order: { countDocuments: vi.fn(), aggregate: vi.fn(), find: vi.fn() },
}));
vi.mock("@/models/Fulfillment", () => ({
  Fulfillment: { countDocuments: vi.fn(), aggregate: vi.fn(), find: vi.fn() },
}));
vi.mock("@/models/User", () => ({
  User: { countDocuments: vi.fn() },
}));
vi.mock("@/models/Payment", () => ({
  Payment: { countDocuments: vi.fn() },
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
const mockFulfillmentCount = Fulfillment.countDocuments as unknown as MockFn;
const mockFulfillmentAggregate = Fulfillment.aggregate as unknown as MockFn;
const mockFulfillmentFind = Fulfillment.find as unknown as MockFn;
const mockUserCount = User.countDocuments as unknown as MockFn;
const mockPaymentCount = Payment.countDocuments as unknown as MockFn;
const mockBookingCount = Booking.countDocuments as unknown as MockFn;

const NOW = new Date("2026-09-04T12:00:00.000Z");

interface AggregateStage {
  $match?: unknown;
  $unwind?: unknown;
  $group?: { _id: unknown };
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

  mockFulfillmentCount.mockImplementation((f: Record<string, unknown>) => {
    const inList = (f.status as { $in?: string[] } | undefined)?.$in;
    if (f.status === "FULFILLED") return Promise.resolve(5);
    if (inList) {
      if (f.type) return Promise.resolve(inList[0] === "PENDING" ? 1 : 2);
      return Promise.resolve(3);
    }
    return Promise.resolve(0);
  });

  mockPaymentCount.mockImplementation((f: Record<string, unknown>) => {
    const inList = (f.status as { $in?: string[] } | undefined)?.$in;
    if (inList) return Promise.resolve(inList[0] === "FAILED" ? 1 : 2);
    return Promise.resolve(0);
  });

  mockBookingCount.mockImplementation((f: Record<string, unknown>) => {
    if (f.status === "PENDING") return Promise.resolve(2);
    const inList = (f.status as { $in?: string[] } | undefined)?.$in;
    if (inList) return Promise.resolve(3);
    return Promise.resolve(0);
  });

  mockOrderAggregateDefault();

  mockFulfillmentAggregate.mockImplementation(() =>
    Promise.resolve([
      {
        _id: new Date("2026-09-01T00:00:00.000Z"),
        enrollments: 2,
      },
    ] as never[])
  );

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

  mockFulfillmentFind.mockImplementation(() =>
    findChain([
      {
        _id: "f1",
        orderId: "o1",
        status: "FULFILLED",
        fulfilledAt: new Date("2026-09-03T10:00:00.000Z"),
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
});