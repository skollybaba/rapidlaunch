import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMonthRevenueSummary: vi.fn(),
  listMonthlyRevenueSummaries: vi.fn(),
  execMock: vi.fn(),
  leanMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/ProfitReport", () => ({
  ProfitReport: {
    updateOne: vi.fn(() => ({ exec: mocks.execMock })),
    find: vi.fn(() => ({
      sort: vi.fn(() => ({
        limit: vi.fn(() => ({ lean: vi.fn(() => ({ exec: mocks.execMock })) })),
      })),
      lean: vi.fn(() => ({ exec: mocks.execMock })),
    })),
    findOne: vi.fn(() => ({
      lean: vi.fn(() => ({ exec: mocks.execMock })),
    })),
  },
}));

vi.mock("@/lib/services/metrics-service", () => ({
  getMonthRevenueSummary: mocks.getMonthRevenueSummary,
  listMonthlyRevenueSummaries: mocks.listMonthlyRevenueSummaries,
  monthStart: (key: string) => new Date(`${key}-01`),
  monthEndExclusive: (key: string) => new Date(new Date(`${key}-01`).getTime() + 30 * 86400000),
}));

import {
  buildProfitOverview,
  computeFromSummary,
  getProfitOverview,
  saveProfitReport,
  getProfitReportForMonth,
} from "@/lib/services/profit-service";
import { ProfitReportSchema } from "@/types/profit";

describe("profit-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.execMock.mockReset();
    mocks.leanMock.mockReset();
    mocks.getMonthRevenueSummary.mockReset();
    mocks.execMock.mockResolvedValue({ upsertedCount: 1 });
    mocks.getMonthRevenueSummary.mockResolvedValue({
      month: "2024-01",
      grossMinor: 100000,
      discountMinor: 5000,
      netMinor: 95000,
      paidOrders: 5,
      uniqueCustomers: 3,
    });
  });

  describe("computeFromSummary", () => {
    it("computes profit correctly", () => {
      const input = {
        month: "2024-01",
        paystackFeePercent: 1.5,
        paystackFlatFeeMinor: 0,
        expenses: [
          { category: "ADS" as const, label: "Google Ads", amountMinor: 10000 },
          { category: "SERVER" as const, label: "Hosting", amountMinor: 5000 },
        ],
      };
      const summary = {
        month: "2024-01",
        grossMinor: 100000,
        discountMinor: 5000,
        netMinor: 95000,
        paidOrders: 5,
        uniqueCustomers: 3,
      };

      const result = computeFromSummary(input, summary);

      expect(result.month).toBe("2024-01");
      expect(result.netMinor).toBe(95000);
      expect(result.paystackFeesMinor).toBe(1425);
      expect(result.expensesTotalMinor).toBe(15000);
      expect(result.profitMinor).toBe(78575);
    });

    it("handles flat fee per transaction", () => {
      const input = {
        month: "2024-01",
        paystackFeePercent: 1.5,
        paystackFlatFeeMinor: 100,
        expenses: [],
      };
      const summary = {
        month: "2024-01",
        grossMinor: 100000,
        discountMinor: 0,
        netMinor: 100000,
        paidOrders: 10,
        uniqueCustomers: 5,
      };

      const result = computeFromSummary(input, summary);

      expect(result.paystackFeesMinor).toBe(1500 + 1000);
    });
  });

  describe("ProfitReportSchema", () => {
    it("validates valid input", () => {
      const input = {
        month: "2024-01",
        paystackFeePercent: 1.5,
        paystackFlatFeeMinor: 0,
        expenses: [{ category: "ADS", label: "Ads", amountMinor: 10000 }],
      };
      const result = ProfitReportSchema.parse(input);
      expect(result.month).toBe("2024-01");
      expect(result.paystackFeePercent).toBe(1.5);
    });

    it("rejects invalid month format", () => {
      const input = { month: "2024", paystackFeePercent: 1.5, paystackFlatFeeMinor: 0, expenses: [] };
      expect(() => ProfitReportSchema.parse(input)).toThrow();
    });

    it("rejects fee percent > 10", () => {
      const input = { month: "2024-01", paystackFeePercent: 11, paystackFlatFeeMinor: 0, expenses: [] };
      expect(() => ProfitReportSchema.parse(input)).toThrow();
    });
  });

  describe("saveProfitReport", () => {
    it("calls updateOne with upsert", async () => {
      await saveProfitReport({
        month: "2024-01",
        paystackFeePercent: 1.5,
        paystackFlatFeeMinor: 0,
        expenses: [],
      });

      expect(mocks.execMock).toHaveBeenCalled();
    });
  });

  describe("getProfitReportForMonth", () => {
    it("returns computed profit when no saved report", async () => {
      mocks.execMock.mockResolvedValueOnce(null);

      const result = await getProfitReportForMonth("2024-01");

      expect(result.month).toBe("2024-01");
      expect(result.netMinor).toBe(95000);
    });

    it("uses saved report when available", async () => {
      mocks.execMock.mockResolvedValueOnce({
        month: "2024-01",
        paystackFeePercent: 2.0,
        paystackFlatFeeMinor: 50,
        expenses: [{ category: "ADS", label: "Facebook", amountMinor: 20000 }],
        notes: "Test month",
      });

      const result = await getProfitReportForMonth("2024-01");

      expect(result.paystackFeePercent).toBe(2.0);
      expect(result.paystackFlatFeeMinor).toBe(50);
      expect(result.expenses[0].label).toBe("Facebook");
    });
  });

  describe("buildProfitOverview", () => {
    const summaries = [
      {
        month: "2024-01",
        grossMinor: 110000,
        discountMinor: 10000,
        netMinor: 100000,
        paidOrders: 5,
        uniqueCustomers: 3,
      },
      {
        month: "2024-03",
        grossMinor: 50000,
        discountMinor: 0,
        netMinor: 50000,
        paidOrders: 2,
        uniqueCustomers: 2,
      },
    ];

    const reports = [
      {
        month: "2024-02",
        paystackFeePercent: 2,
        paystackFlatFeeMinor: 100,
        expenses: [
          { category: "ADS" as const, label: "Ads", amountMinor: 20000 },
        ],
      },
    ];

    it("fills gaps, applies saved settings and defaults, and accumulates profit", () => {
      const overview = buildProfitOverview(summaries, reports, "2024-03");

      expect(overview.monthly.map((m) => m.month)).toEqual([
        "2024-01",
        "2024-02",
        "2024-03",
      ]);

      const [jan, feb, mar] = overview.monthly;
      expect(jan.profitMinor).toBe(98500);
      expect(jan.hasSavedReport).toBe(false);
      expect(feb.netMinor).toBe(0);
      expect(feb.paystackFeesMinor).toBe(0);
      expect(feb.expensesTotalMinor).toBe(20000);
      expect(feb.profitMinor).toBe(-20000);
      expect(feb.hasSavedReport).toBe(true);
      expect(mar.profitMinor).toBe(49250);

      expect(overview.monthly.map((m) => m.cumulativeProfitMinor)).toEqual([
        98500, 78500, 127750,
      ]);

      expect(overview.allTime).toMatchObject({
        netMinor: 150000,
        paystackFeesMinor: 2250,
        expensesTotalMinor: 20000,
        profitMinor: 127750,
        paidOrders: 7,
        months: 3,
        profitableMonths: 2,
        lossMonths: 1,
      });
      expect(overview.bestMonth?.month).toBe("2024-01");
      expect(overview.worstMonth?.month).toBe("2024-02");
    });

    it("extends the timeline to the current month", () => {
      const overview = buildProfitOverview(summaries, [], "2024-05");

      expect(overview.monthly).toHaveLength(5);
      expect(overview.monthly[4]).toMatchObject({
        month: "2024-05",
        profitMinor: 0,
        paidOrders: 0,
      });
      expect(overview.allTime.months).toBe(5);
    });

    it("returns an empty overview when there is no history", () => {
      const overview = buildProfitOverview([], [], "2024-05");

      expect(overview.monthly).toEqual([]);
      expect(overview.bestMonth).toBeNull();
      expect(overview.worstMonth).toBeNull();
      expect(overview.allTime.profitMinor).toBe(0);
      expect(overview.allTime.months).toBe(0);
    });

    it("marks a loss-making business as negative to date", () => {
      const overview = buildProfitOverview(
        [
          {
            month: "2024-01",
            grossMinor: 10000,
            discountMinor: 0,
            netMinor: 10000,
            paidOrders: 1,
            uniqueCustomers: 1,
          },
        ],
        [
          {
            month: "2024-01",
            paystackFeePercent: 2,
            paystackFlatFeeMinor: 0,
            expenses: [
              { category: "ADS" as const, label: "Ads", amountMinor: 50000 },
            ],
          },
        ],
        "2024-01"
      );

      expect(overview.monthly[0].profitMinor).toBe(-40200);
      expect(overview.allTime.profitMinor).toBe(-40200);
      expect(overview.allTime.lossMonths).toBe(1);
      expect(overview.allTime.profitableMonths).toBe(0);
    });
  });

  describe("getProfitOverview", () => {
    it("combines revenue summaries with saved reports", async () => {
      const today = new Date();
      const currentMonth = `${today.getUTCFullYear()}-${String(
        today.getUTCMonth() + 1
      ).padStart(2, "0")}`;
      const lastMonthDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)
      );
      const lastMonth = `${lastMonthDate.getUTCFullYear()}-${String(
        lastMonthDate.getUTCMonth() + 1
      ).padStart(2, "0")}`;

      mocks.listMonthlyRevenueSummaries.mockResolvedValueOnce([
        {
          month: lastMonth,
          grossMinor: 100000,
          discountMinor: 0,
          netMinor: 100000,
          paidOrders: 4,
          uniqueCustomers: 3,
        },
      ]);
      mocks.execMock.mockResolvedValueOnce([
        {
          month: lastMonth,
          paystackFeePercent: 2,
          paystackFlatFeeMinor: 0,
          expenses: [{ category: "ADS", amountMinor: 30000 }],
        },
      ]);

      const overview = await getProfitOverview();

      expect(mocks.listMonthlyRevenueSummaries).toHaveBeenCalled();
      expect(overview.monthly.at(-1)?.month).toBe(currentMonth);
      const saved = overview.monthly.find((m) => m.month === lastMonth);
      expect(saved?.hasSavedReport).toBe(true);
      expect(saved?.paystackFeesMinor).toBe(2000);
      expect(saved?.profitMinor).toBe(68000);
      expect(overview.allTime.paidOrders).toBe(4);
    });
  });
});