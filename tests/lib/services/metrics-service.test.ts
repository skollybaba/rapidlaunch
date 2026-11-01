import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const execMock = vi.fn();
  const countMock = vi.fn();
  const aggregateMock = vi.fn();
  const makeFindChain = () => ({
    select: vi.fn(() => ({
      sort: vi.fn(() => ({
        lean: vi.fn(() => ({ exec: execMock })),
      })),
    })),
  });

  return {
    execMock,
    countMock,
    aggregateMock,
    makeFindChain,
  };
});

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/Order", () => ({
  Order: {
    find: vi.fn(() => ({
      select: vi.fn(() => ({
        sort: vi.fn(() => ({
          lean: vi.fn(() => ({ exec: mocks.execMock })),
        })),
      })),
      sort: vi.fn(() => ({
        lean: vi.fn(() => ({ exec: mocks.execMock })),
      })),
    })),
    countDocuments: mocks.countMock,
    aggregate: mocks.aggregateMock,
  },
}));

vi.mock("@/models/Payment", () => ({
  Payment: {
    countDocuments: mocks.countMock,
    aggregate: mocks.aggregateMock,
  },
}));

vi.mock("@/models/AnalyticsEvent", () => ({
  AnalyticsEvent: {
    countDocuments: mocks.countMock,
  },
}));

vi.mock("@/models/Enrollment", () => ({
  Enrollment: {
    countDocuments: mocks.countMock,
    aggregate: mocks.aggregateMock,
  },
}));

vi.mock("@/models/Booking", () => ({
  Booking: {
    countDocuments: mocks.countMock,
  },
}));

vi.mock("@/models/Lead", () => ({
  Lead: {
    countDocuments: mocks.countMock,
  },
}));

vi.mock("@/models/Fulfillment", () => ({
  Fulfillment: {
    countDocuments: mocks.countMock,
    aggregate: mocks.aggregateMock,
  },
}));

import { getRevenueMetrics, getFunnelMetrics, getUsageMetrics, getCustomerMetrics, getFocusInsights, getCustomerDetail, resolveWindow, METRIC_WINDOWS, CUSTOM_WINDOW_KEY } from "@/lib/services/metrics-service";

describe("metrics-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countMock.mockReset();
    mocks.aggregateMock.mockReset();
    mocks.execMock.mockReset();
    mocks.execMock.mockResolvedValue([]);
  });

  describe("getRevenueMetrics", () => {
    it("returns zero KPIs when no orders", async () => {
      mocks.execMock.mockResolvedValue([]);
      mocks.countMock.mockResolvedValue(0);

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
      mocks.countMock.mockResolvedValue(0);

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
      mocks.countMock.mockResolvedValue(0);
      mocks.aggregateMock.mockResolvedValue([]);

      const result = await getFunnelMetrics("30d");

      expect(result.checkoutViews).toBe(0);
      expect(result.ordersCreated).toBe(0);
      expect(result.paymentsStarted).toBe(0);
      expect(result.paidOrders).toBe(0);
    });
  });

  describe("getUsageMetrics", () => {
    it("returns zero counts when no data", async () => {
      mocks.countMock.mockResolvedValue(0);
      mocks.aggregateMock.mockResolvedValue([]);

      const result = await getUsageMetrics("30d");

      expect(result.activeEnrollments).toBe(0);
      expect(result.activeLearners).toBe(0);
      expect(result.bookingsConfirmed).toBe(0);
      expect(result.leadsTotal).toBe(0);
    });

    it("excludes complimentary admin grants from every enrollment metric", async () => {
      mocks.countMock.mockResolvedValue(0);
      mocks.aggregateMock.mockResolvedValue([]);
      mocks.execMock.mockResolvedValue([]);

      await getRevenueMetrics("30d");
      await getUsageMetrics("30d");

      // Enrollment filters are the ones that key on bonus status or progress.
      const enrollmentFilters = mocks.countMock.mock.calls
        .map(([filter]) => filter as Record<string, unknown>)
        .filter(
          (filter) =>
            filter &&
            ("isBonus" in filter || "completedLessonIds.0" in filter)
        );

      expect(enrollmentFilters.length).toBeGreaterThan(0);
      for (const filter of enrollmentFilters) {
        expect(filter.accessSource).toEqual({ $ne: "ADMIN_GRANT" });
      }

      const activeMatches = mocks.aggregateMock.mock.calls
        .flatMap(([pipeline]) =>
          (pipeline as Record<string, unknown>[]).map((stage) => stage.$match)
        )
        .filter(
          (match): match is Record<string, unknown> =>
            Boolean(match) && (match as Record<string, unknown>).status === "ACTIVE"
        );

      expect(activeMatches.length).toBeGreaterThan(0);
      for (const match of activeMatches) {
        expect(match.accessSource).toEqual({ $ne: "ADMIN_GRANT" });
      }
    });
  });

  describe("getCustomerMetrics", () => {
    it("returns zero metrics when no customers", async () => {
      mocks.aggregateMock.mockResolvedValue([]);

      const result = await getCustomerMetrics("30d");

      expect(result.totalCustomers).toBe(0);
      expect(result.repeatRatePct).toBe(0);
      expect(result.averageLtvMinor).toBe(0);
    });
  });

  describe("getFocusInsights", () => {
    it("returns healthy baseline when no issues", async () => {
      mocks.aggregateMock.mockResolvedValue([]);
      mocks.countMock.mockResolvedValue(0);
      mocks.execMock.mockResolvedValue([]);

      const insights = await getFocusInsights("30d");

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].severity).toBe("opportunity");
      expect(insights[0].title).toContain("healthy");
    });
  });

  describe("getCustomerDetail", () => {
    it("returns empty when no orders", async () => {
      mocks.execMock.mockResolvedValue([]);

      const result = await getCustomerDetail("test@example.com");

      expect(result.email).toBe("test@example.com");
      expect(result.orders).toEqual([]);
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