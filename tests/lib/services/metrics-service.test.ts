import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const execMock = vi.fn();
  const findChain = () => {
    const chain = {
      select: vi.fn(() => chain),
      sort: vi.fn(() => chain),
      lean: vi.fn(() => chain),
      exec: execMock,
    };
    return chain;
  };

  // One set of mocks per model so a test can assert which collection a filter
  // belongs to instead of guessing from the shape of the filter.
  return {
    execMock,
    findChain,
    order: {
      find: vi.fn(findChain),
      countDocuments: vi.fn(),
      aggregate: vi.fn(),
    },
    payment: { countDocuments: vi.fn(), aggregate: vi.fn() },
    analyticsEvent: { countDocuments: vi.fn() },
    enrollment: { countDocuments: vi.fn(), aggregate: vi.fn() },
    booking: { countDocuments: vi.fn() },
    lead: { countDocuments: vi.fn() },
    fulfillment: { countDocuments: vi.fn(), aggregate: vi.fn() },
  };
});

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/Order", () => ({
  Order: mocks.order,
}));

vi.mock("@/models/Payment", () => ({
  Payment: mocks.payment,
}));

vi.mock("@/models/AnalyticsEvent", () => ({
  AnalyticsEvent: mocks.analyticsEvent,
}));

vi.mock("@/models/Enrollment", () => ({
  Enrollment: mocks.enrollment,
}));

vi.mock("@/models/Booking", () => ({
  Booking: mocks.booking,
}));

vi.mock("@/models/Lead", () => ({
  Lead: mocks.lead,
}));

vi.mock("@/models/Fulfillment", () => ({
  Fulfillment: mocks.fulfillment,
}));

import { getRevenueMetrics, getFunnelMetrics, getUsageMetrics, getCustomerMetrics, getFocusInsights, getCustomerDetail, resolveWindow, METRIC_WINDOWS, CUSTOM_WINDOW_KEY } from "@/lib/services/metrics-service";

const COUNT_MOCKS = [
  mocks.order.countDocuments,
  mocks.payment.countDocuments,
  mocks.analyticsEvent.countDocuments,
  mocks.enrollment.countDocuments,
  mocks.booking.countDocuments,
  mocks.lead.countDocuments,
  mocks.fulfillment.countDocuments,
];

const AGGREGATE_MOCKS = [
  mocks.order.aggregate,
  mocks.payment.aggregate,
  mocks.enrollment.aggregate,
  mocks.fulfillment.aggregate,
];

const PRODUCT_ID = "64b000000000000000000001";

describe("metrics-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.execMock.mockReset();
    mocks.execMock.mockResolvedValue([]);
    for (const mock of COUNT_MOCKS) {
      mock.mockReset();
      mock.mockResolvedValue(0);
    }
    for (const mock of AGGREGATE_MOCKS) {
      mock.mockReset();
      mock.mockResolvedValue([]);
    }
  });

  describe("getRevenueMetrics", () => {
    it("returns zero KPIs when no orders", async () => {
      const result = await getRevenueMetrics("30d");

      expect(result.window.key).toBe("30d");
      expect(result.gross.current).toBe(0);
      expect(result.net.current).toBe(0);
      expect(result.paidOrders.current).toBe(0);
      expect(result.productsByRevenue).toEqual([]);
    });

    it("computes revenue from paid orders", async () => {
      const now = new Date();
      const orders = [
        {
          _id: "o1",
          orderReference: "QL-1",
          customerEmail: "a@b.com",
          paidAt: new Date(now.getTime() - 86400000),
          subtotalMinor: 10000,
          discountMinor: 1000,
          totalMinor: 9000,
          items: [{ productId: "p1", titleSnapshot: "Course A", typeSnapshot: "COURSE", unitPriceMinor: 10000, quantity: 1 }],
          metadata: {},
        },
        {
          _id: "o2",
          orderReference: "QL-2",
          customerEmail: "c@d.com",
          paidAt: new Date(now.getTime() - 172800000),
          subtotalMinor: 20000,
          discountMinor: 0,
          totalMinor: 20000,
          items: [{ productId: "p2", titleSnapshot: "Book B", typeSnapshot: "BOOK", unitPriceMinor: 20000, quantity: 1 }],
          metadata: { coupon: { code: "SAVE10" } },
        },
      ];
      mocks.execMock.mockResolvedValue(orders);

      const result = await getRevenueMetrics("30d");

      expect(result.gross.current).toBe(30000);
      expect(result.net.current).toBe(29000);
      expect(result.paidOrders.current).toBe(2);
      expect(result.productsByRevenue.length).toBe(2);
      expect(result.couponSummary[0]?.code).toBe("SAVE10");
    });
  });

  describe("getFunnelMetrics", () => {
    it("returns zero steps when no data", async () => {
      const result = await getFunnelMetrics("30d");

      expect(result.checkoutViews).toBe(0);
      expect(result.ordersCreated).toBe(0);
      expect(result.paymentsStarted).toBe(0);
      expect(result.paidOrders).toBe(0);
    });
  });

  describe("getUsageMetrics", () => {
    it("returns zero counts when no data", async () => {
      const result = await getUsageMetrics("30d");

      expect(result.activeEnrollments).toBe(0);
      expect(result.activeLearners).toBe(0);
      expect(result.bookingsConfirmed).toBe(0);
      expect(result.leadsTotal).toBe(0);
    });

    it("excludes complimentary admin grants from every enrollment metric", async () => {
      await getRevenueMetrics("30d");
      await getUsageMetrics("30d");

      // Every enrollment query — counts and aggregates alike — must skip seats
      // an admin handed out for free.
      const filters = mocks.enrollment.countDocuments.mock.calls.map(
        ([filter]) => filter as Record<string, unknown>
      );
      expect(filters.length).toBeGreaterThan(0);
      for (const filter of filters) {
        expect(filter.accessSource).toEqual({ $ne: "ADMIN_GRANT" });
      }

      const activeMatches = mocks.enrollment.aggregate.mock.calls.flatMap(
        ([pipeline]) =>
          (pipeline as Record<string, unknown>[])
            .map((stage) => stage.$match as Record<string, unknown> | undefined)
            .filter((match): match is Record<string, unknown> => Boolean(match))
      );
      expect(activeMatches.length).toBeGreaterThan(0);
      for (const match of activeMatches) {
        expect(match.accessSource).toEqual({ $ne: "ADMIN_GRANT" });
      }
    });
  });

  describe("getCustomerMetrics", () => {
    it("returns zero metrics when no customers", async () => {
      const result = await getCustomerMetrics("30d");

      expect(result.totalCustomers).toBe(0);
      expect(result.repeatRatePct).toBe(0);
      expect(result.averageLtvMinor).toBe(0);
    });
  });

  describe("getFocusInsights", () => {
    it("returns healthy baseline when no issues", async () => {
      const insights = await getFocusInsights("30d");

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].severity).toBe("opportunity");
      expect(insights[0].title).toContain("healthy");
    });
  });

  describe("getCustomerDetail", () => {
    it("returns empty when no orders", async () => {
      const result = await getCustomerDetail("test@example.com");

      expect(result.email).toBe("test@example.com");
      expect(result.orders).toEqual([]);
    });
  });

  describe("product filter", () => {
    it("scopes revenue orders and enrollment counts to the product", async () => {
      await getRevenueMetrics({ window: "30d", product: PRODUCT_ID });

      const [orderFilter] = mocks.order.find.mock.calls[0] as unknown as [
        Record<string, unknown>,
      ];
      expect(String(orderFilter["items.productId"])).toBe(PRODUCT_ID);

      // Purchased and bonus seat counts both narrow to this course.
      expect(mocks.enrollment.countDocuments).toHaveBeenCalledTimes(2);
      for (const [filter] of mocks.enrollment.countDocuments.mock.calls) {
        expect(String((filter as Record<string, unknown>).courseId)).toBe(
          PRODUCT_ID
        );
      }
    });

    it("attributes revenue only to the matching line item", async () => {
      mocks.execMock.mockResolvedValue([
        {
          _id: "o1",
          orderReference: "QL-1",
          customerEmail: "a@b.com",
          paidAt: new Date(Date.now() - 3_600_000),
          subtotalMinor: 30000,
          discountMinor: 0,
          totalMinor: 30000,
          items: [
            {
              productId: "64b000000000000000000002",
              titleSnapshot: "Other course",
              typeSnapshot: "COURSE",
              unitPriceMinor: 20000,
              quantity: 1,
            },
            {
              productId: PRODUCT_ID,
              titleSnapshot: "Filtered course",
              typeSnapshot: "COURSE",
              unitPriceMinor: 10000,
              quantity: 1,
            },
          ],
          metadata: {},
        },
      ]);

      const result = await getRevenueMetrics({
        window: "30d",
        product: PRODUCT_ID,
      });

      expect(result.productsByRevenue).toHaveLength(1);
      expect(result.productsByRevenue[0]).toMatchObject({
        productId: PRODUCT_ID,
        title: "Filtered course",
        orders: 1,
      });
    });

    it("scopes analytics events, orders and payment lookups in the funnel", async () => {
      await getFunnelMetrics({ window: "30d", product: PRODUCT_ID });

      // AnalyticsEvent stores the product id as a plain string.
      const [analyticsFilter] = mocks.analyticsEvent.countDocuments.mock
        .calls[0] as [Record<string, unknown>];
      expect(analyticsFilter.productId).toBe(PRODUCT_ID);

      const orderFilters = mocks.order.countDocuments.mock.calls.map(
        ([filter]) => filter as Record<string, unknown>
      );
      expect(orderFilters).toHaveLength(2);
      for (const filter of orderFilters) {
        expect(String(filter["items.productId"])).toBe(PRODUCT_ID);
      }

      // Payments carry no product column, so both pipelines join their order.
      const pipelines = mocks.payment.aggregate.mock.calls.map(
        ([pipeline]) => pipeline as Record<string, unknown>[]
      );
      expect(pipelines).toHaveLength(2);
      for (const pipeline of pipelines) {
        const productMatches = pipeline
          .map((stage) => stage.$match as Record<string, unknown> | undefined)
          .filter(Boolean);
        expect(
          productMatches.some(
            (match) =>
              String(match!["__liveOrder.items.productId"]) === PRODUCT_ID
          )
        ).toBe(true);
      }
      expect(mocks.payment.countDocuments).not.toHaveBeenCalled();
    });

    it("scopes enrollments, bookings and leads to the product", async () => {
      await getUsageMetrics({ window: "30d", product: PRODUCT_ID });

      expect(mocks.enrollment.countDocuments).toHaveBeenCalled();
      for (const [filter] of mocks.enrollment.countDocuments.mock.calls) {
        expect(String((filter as Record<string, unknown>).courseId)).toBe(
          PRODUCT_ID
        );
      }

      const enrollmentMatches = mocks.enrollment.aggregate.mock.calls.flatMap(
        ([pipeline]) =>
          (pipeline as Record<string, unknown>[])
            .map((stage) => stage.$match as Record<string, unknown> | undefined)
            .filter(Boolean)
      );
      expect(enrollmentMatches.length).toBeGreaterThan(0);
      for (const match of enrollmentMatches) {
        expect(String(match!.courseId)).toBe(PRODUCT_ID);
      }

      expect(mocks.booking.countDocuments).toHaveBeenCalledTimes(3);
      for (const [filter] of mocks.booking.countDocuments.mock.calls) {
        expect(String((filter as Record<string, unknown>).productId)).toBe(
          PRODUCT_ID
        );
      }

      expect(mocks.lead.countDocuments).toHaveBeenCalledTimes(2);
      for (const [filter] of mocks.lead.countDocuments.mock.calls) {
        expect(String((filter as Record<string, unknown>).productId)).toBe(
          PRODUCT_ID
        );
      }
    });

    it("scopes the customer aggregate to the product", async () => {
      await getCustomerMetrics({ window: "30d", product: PRODUCT_ID });

      const [pipeline] = mocks.order.aggregate.mock.calls[0] as [
        Record<string, unknown>[],
      ];
      const [firstStage] = pipeline;
      const match = firstStage.$match as Record<string, unknown>;
      expect(String(match["items.productId"])).toBe(PRODUCT_ID);
    });

    it("scopes fulfillment issues to the product's orders", async () => {
      await getFocusInsights({ window: "30d", product: PRODUCT_ID });

      const pipelines = mocks.fulfillment.aggregate.mock.calls.map(
        ([pipeline]) => pipeline as Record<string, unknown>[]
      );
      const scoped = pipelines.some((pipeline) =>
        pipeline.some(
          (stage) =>
            stage.$match &&
            String(
              (stage.$match as Record<string, unknown>)[
                "__liveOrder.items.productId"
              ]
            ) === PRODUCT_ID
        )
      );
      expect(scoped).toBe(true);
    });

    it("ignores a malformed product id and reports the whole business", async () => {
      await getRevenueMetrics({ window: "30d", product: "not-an-id" });

      const [orderFilter] = mocks.order.find.mock.calls[0] as unknown as [
        Record<string, unknown>,
      ];
      expect(orderFilter["items.productId"]).toBeUndefined();
    });
  });

  describe("METRIC_WINDOWS", () => {
    it("contains expected window keys", () => {
      expect(METRIC_WINDOWS).toContain("7d");
      expect(METRIC_WINDOWS).toContain("30d");
      expect(METRIC_WINDOWS).toContain("90d");
      expect(METRIC_WINDOWS).toContain("12m");
    });
  });

  describe("resolveWindow", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");

    it("resolves a preset window from a string key", () => {
      const window = resolveWindow("90d", now);

      expect(window.key).toBe("90d");
      expect(window.bucketUnit).toBe("week");
      expect(window.startDate).toBeUndefined();
      expect(window.endDate).toBeUndefined();
    });

    it("defaults to the 30 day window for unknown keys", () => {
      expect(resolveWindow("nonsense", now).key).toBe("30d");
      expect(resolveWindow(undefined, now).key).toBe("30d");
    });

    it("resolves a custom range with an inclusive end date", () => {
      const window = resolveWindow(
        { window: CUSTOM_WINDOW_KEY, start: "2026-01-01", end: "2026-01-31" },
        now
      );

      expect(window.key).toBe(CUSTOM_WINDOW_KEY);
      expect(window.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
      // The end bound is exclusive so the picked day is fully included.
      expect(window.end.toISOString()).toBe("2026-02-01T00:00:00.000Z");
      expect(window.startDate).toBe("2026-01-01");
      expect(window.endDate).toBe("2026-01-31");
      expect(window.bucketUnit).toBe("day");
      expect(window.previousLabel).toBe("Previous 31d");
      // Previous window has the same length and ends where the current starts.
      expect(window.previousStart.toISOString()).toBe(
        "2025-12-01T00:00:00.000Z"
      );
    });

    it("selects a weekly bucket for mid-length custom ranges", () => {
      const window = resolveWindow(
        { window: CUSTOM_WINDOW_KEY, start: "2026-01-01", end: "2026-03-01" },
        now
      );
      expect(window.bucketUnit).toBe("week");
    });

    it("selects a monthly bucket for long custom ranges", () => {
      const window = resolveWindow(
        { window: CUSTOM_WINDOW_KEY, start: "2025-01-01", end: "2026-01-01" },
        now
      );
      expect(window.bucketUnit).toBe("month");
    });

    it("clamps a future end date to today", () => {
      const window = resolveWindow(
        { window: CUSTOM_WINDOW_KEY, start: "2026-06-01", end: "2026-12-31" },
        now
      );

      expect(window.key).toBe(CUSTOM_WINDOW_KEY);
      expect(window.endDate).toBe("2026-06-15");
      expect(window.end.toISOString()).toBe("2026-06-16T00:00:00.000Z");
    });

    it("supports a single-day custom range", () => {
      const window = resolveWindow(
        { window: CUSTOM_WINDOW_KEY, start: "2026-06-15", end: "2026-06-15" },
        now
      );

      expect(window.key).toBe(CUSTOM_WINDOW_KEY);
      expect(window.start.toISOString()).toBe("2026-06-15T00:00:00.000Z");
      expect(window.end.toISOString()).toBe("2026-06-16T00:00:00.000Z");
    });

    it("falls back to 30 days for invalid custom input", () => {
      const invalid = [
        { window: CUSTOM_WINDOW_KEY },
        { window: CUSTOM_WINDOW_KEY, start: "2026-01-01" },
        { window: CUSTOM_WINDOW_KEY, start: "2026-02-31", end: "2026-03-01" },
        { window: CUSTOM_WINDOW_KEY, start: "2026-03-01", end: "2026-01-01" },
        { window: CUSTOM_WINDOW_KEY, start: "2010-01-01", end: "2026-01-01" },
      ];

      for (const input of invalid) {
        expect(resolveWindow(input, now).key).toBe("30d");
      }
    });
  });
});