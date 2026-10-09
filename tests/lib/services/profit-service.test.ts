import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMonthRevenueSummary: vi.fn(),
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
    })),
    findOne: vi.fn(() => ({
      lean: vi.fn(() => ({ exec: mocks.execMock })),
    })),
  },
}));

vi.mock("@/lib/services/metrics-service", () => ({
  getMonthRevenueSummary: mocks.getMonthRevenueSummary,
  monthStart: (key: string) => new Date(`${key}-01`),
  monthEndExclusive: (key: string) => new Date(new Date(`${key}-01`).getTime() + 30 * 86400000),
}));

import { computeFromSummary, saveProfitReport, getProfitReportForMonth } from "@/lib/services/profit-service";
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
});