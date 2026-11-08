import { z } from "zod";

export const EXPENSE_CATEGORIES = ["ADS", "SALARY", "SERVER", "CUSTOM"] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const ExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  label: z.string().trim().max(120).optional(),
  amountMinor: z.number().int().nonnegative().max(10_000_000_000),
});

export type ExpenseInput = z.infer<typeof ExpenseSchema>;

export const ProfitReportSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .refine((v) => {
      const [y, m] = v.split("-").map(Number);
      return y >= 2000 && y <= 2100 && m >= 1 && m <= 12;
    }),
  paystackFeePercent: z
    .number()
    .min(0)
    .max(10)
    .default(1.5),
  paystackFlatFeeMinor: z
    .number()
    .int()
    .nonnegative()
    .max(10_000_000)
    .default(0),
  expenses: z.array(ExpenseSchema).default([]),
  notes: z.string().trim().max(2000).optional(),
});

export type ProfitReportInput = z.infer<typeof ProfitReportSchema>;

export interface ProfitReportDoc {
  _id: unknown;
  month: string;
  paystackFeePercent: number;
  paystackFlatFeeMinor: number;
  expenses: {
    category: ExpenseCategory;
    label?: string;
    amountMinor: number;
  }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthRevenueBreakdown {
  month: string;
  grossMinor: number;
  discountMinor: number;
  netMinor: number;
  paidOrders: number;
  uniqueCustomers: number;
}

export interface ProfitCalculation {
  month: string;
  grossMinor: number;
  discountMinor: number;
  netMinor: number;
  paidOrders: number;
  uniqueCustomers: number;
  paystackFeePercent: number;
  paystackFlatFeeMinor: number;
  paystackFeesMinor: number;
  expensesTotalMinor: number;
  expenses: {
    category: ExpenseCategory;
    label?: string;
    amountMinor: number;
  }[];
  notes?: string;
  profitMinor: number;
  currency: "NGN";
}

export interface ProfitMonthPoint {
  /** `YYYY-MM` month key, UTC. */
  month: string;
  netMinor: number;
  paystackFeesMinor: number;
  expensesTotalMinor: number;
  profitMinor: number;
  /** Running total of `profitMinor` from the first known month to this one. */
  cumulativeProfitMinor: number;
  paidOrders: number;
  /** True when a saved report supplied the fee settings and expenses. */
  hasSavedReport: boolean;
  /** True when the month has at least one paid order. */
  hasRevenue: boolean;
}

export interface ProfitTotals {
  netMinor: number;
  paystackFeesMinor: number;
  expensesTotalMinor: number;
  profitMinor: number;
  paidOrders: number;
  months: number;
  profitableMonths: number;
  lossMonths: number;
}

export interface ProfitOverview {
  /** Ascending by month, one entry per month with no gaps. */
  monthly: ProfitMonthPoint[];
  allTime: ProfitTotals;
  bestMonth: ProfitMonthPoint | null;
  worstMonth: ProfitMonthPoint | null;
  currency: "NGN";
}

export interface ProfitReportEmailPayload {
  month: string;
  to: string[];
  fromEmail: string;
  fromName: string;
  subject: string;
  html: string;
  text: string;
}