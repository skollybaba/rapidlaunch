import "server-only";

import { createMailAdapter } from "@/lib/providers/mail";
import { ProfitReport } from "@/models/ProfitReport";
import { dbConnect } from "@/lib/db";
import {
  getMonthRevenueSummary,
  listMonthlyRevenueSummaries,
  type MonthRevenueSummary,
} from "@/lib/services/metrics-service";
import {
  ProfitCalculation,
  ProfitMonthPoint,
  ProfitOverview,
  ProfitReportInput,
  ProfitReportSchema,
  ProfitTotals,
} from "@/types/profit";

export type { ProfitReportInput, ProfitReportSchema } from "@/types/profit";

const CURRENCY = "NGN";
const DEFAULT_FEE_PERCENT = 1.5;
/** Keep the inception-to-date view readable even if a stray month key is bad. */
const MAX_OVERVIEW_MONTHS = 120;

export type ProfitReportSettings = Pick<
  ProfitReportInput,
  "month" | "paystackFeePercent" | "paystackFlatFeeMinor" | "expenses"
>;

export class ProfitReportServiceError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "ProfitReportServiceError";
    this.code = code;
    this.status = status;
  }
}

export async function computeProfit(
  input: ProfitReportInput
): Promise<ProfitCalculation> {
  const summary = await getMonthRevenueSummary(input.month);
  return computeFromSummary(input, summary);
}

export function computeFromSummary(
  input: ProfitReportInput,
  summary: { month: string; grossMinor: number; discountMinor: number; netMinor: number; paidOrders: number; uniqueCustomers: number }
): ProfitCalculation {
  const parsed = ProfitReportSchema.parse(input);
  const expensesTotalMinor = parsed.expenses.reduce(
    (sum, e) => sum + e.amountMinor,
    0
  );
  const paystackFeesMinor =
    Math.round(parsed.paystackFeePercent * (summary.netMinor / 100)) +
    parsed.paystackFlatFeeMinor * summary.paidOrders;
  const profitMinor = summary.netMinor - paystackFeesMinor - expensesTotalMinor;
  return {
    month: parsed.month,
    grossMinor: summary.grossMinor,
    discountMinor: summary.discountMinor,
    netMinor: summary.netMinor,
    paidOrders: summary.paidOrders,
    uniqueCustomers: summary.uniqueCustomers,
    paystackFeePercent: parsed.paystackFeePercent,
    paystackFlatFeeMinor: parsed.paystackFlatFeeMinor,
    paystackFeesMinor: Math.max(0, paystackFeesMinor),
    expensesTotalMinor,
    expenses: parsed.expenses,
    notes: parsed.notes,
    profitMinor,
    currency: CURRENCY,
  };
}

export async function saveProfitReport(
  input: ProfitReportInput
): Promise<ProfitCalculation> {
  await dbConnect();
  const parsed = ProfitReportSchema.parse(input);
  await ProfitReport.updateOne(
    { month: parsed.month },
    { $set: parsed },
    { upsert: true }
  ).exec();
  return computeProfit(parsed);
}

export async function listProfitReports(limit = 12) {
  await dbConnect();
  const docs = await ProfitReport.find({})
    .sort({ month: -1 })
    .limit(limit)
    .lean()
    .exec();
  const withCalcs = await Promise.all(
    docs.map(async (doc) => {
      const summary = await getMonthRevenueSummary(doc.month);
      return computeFromSummary(doc, summary);
    })
  );
  return withCalcs;
}

export async function getProfitReportForMonth(month: string) {
  await dbConnect();
  const summary = await getMonthRevenueSummary(month);
  const doc = await ProfitReport.findOne({ month }).lean().exec();
  if (!doc) {
    return computeFromSummary(
      {
        month,
        paystackFeePercent: DEFAULT_FEE_PERCENT,
        paystackFlatFeeMinor: 0,
        expenses: [],
      },
      summary
    );
  }
  return computeFromSummary(doc, summary);
}

function monthKeyOfUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function isMonthKey(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [, month] = value.split("-").map(Number);
  return month >= 1 && month <= 12;
}

/** Continuous list of month keys from `start` to `end`, inclusive. */
function monthKeysBetween(start: string, end: string): string[] {
  const keys: string[] = [];
  let [year, month] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);

  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return keys;
}

/**
 * Pure builder for the inception-to-date profitability view.
 *
 * Each month uses its saved fee settings and expenses when a report exists,
 * otherwise the default 1.5% fee assumption with no expenses — the same rule
 * `getProfitReportForMonth` applies. Months without revenue still appear so the
 * chart keeps an honest timeline.
 */
export function buildProfitOverview(
  summaries: MonthRevenueSummary[],
  reports: ProfitReportSettings[],
  currentMonth: string
): ProfitOverview {
  const summaryByMonth = new Map(summaries.map((s) => [s.month, s]));
  const reportByMonth = new Map(reports.map((r) => [r.month, r]));

  const knownMonths = [
    ...new Set([...summaryByMonth.keys(), ...reportByMonth.keys()]),
  ]
    .filter(isMonthKey)
    .sort();

  const emptyAllTime: ProfitTotals = {
    netMinor: 0,
    paystackFeesMinor: 0,
    expensesTotalMinor: 0,
    profitMinor: 0,
    paidOrders: 0,
    months: 0,
    profitableMonths: 0,
    lossMonths: 0,
  };

  if (knownMonths.length === 0) {
    return {
      monthly: [],
      allTime: emptyAllTime,
      bestMonth: null,
      worstMonth: null,
      currency: CURRENCY,
    };
  }

  const start = knownMonths[0];
  const latestKnown = knownMonths[knownMonths.length - 1];
  const end = latestKnown > currentMonth ? latestKnown : currentMonth;

  let keys = monthKeysBetween(start, end);
  if (keys.length > MAX_OVERVIEW_MONTHS) {
    keys = keys.slice(-MAX_OVERVIEW_MONTHS);
  }

  let cumulative = 0;
  const monthly: ProfitMonthPoint[] = keys.map((month) => {
    const summary = summaryByMonth.get(month) ?? {
      month,
      grossMinor: 0,
      discountMinor: 0,
      netMinor: 0,
      paidOrders: 0,
      uniqueCustomers: 0,
    };
    const settings = reportByMonth.get(month) ?? {
      month,
      paystackFeePercent: DEFAULT_FEE_PERCENT,
      paystackFlatFeeMinor: 0,
      expenses: [],
    };
    const calc = computeFromSummary(settings, summary);
    cumulative += calc.profitMinor;

    return {
      month,
      netMinor: calc.netMinor,
      paystackFeesMinor: calc.paystackFeesMinor,
      expensesTotalMinor: calc.expensesTotalMinor,
      profitMinor: calc.profitMinor,
      cumulativeProfitMinor: cumulative,
      paidOrders: calc.paidOrders,
      hasSavedReport: reportByMonth.has(month),
      hasRevenue: calc.paidOrders > 0,
    };
  });

  const allTime = monthly.reduce<ProfitTotals>(
    (totals, point) => ({
      netMinor: totals.netMinor + point.netMinor,
      paystackFeesMinor: totals.paystackFeesMinor + point.paystackFeesMinor,
      expensesTotalMinor: totals.expensesTotalMinor + point.expensesTotalMinor,
      profitMinor: totals.profitMinor + point.profitMinor,
      paidOrders: totals.paidOrders + point.paidOrders,
      months: totals.months + 1,
      profitableMonths: totals.profitableMonths + (point.profitMinor >= 0 ? 1 : 0),
      lossMonths: totals.lossMonths + (point.profitMinor < 0 ? 1 : 0),
    }),
    { ...emptyAllTime }
  );

  const meaningful = monthly.filter(
    (point) => point.hasRevenue || point.profitMinor !== 0
  );
  const bestMonth =
    meaningful.length > 0
      ? meaningful.reduce((best, point) =>
          point.profitMinor > best.profitMinor ? point : best
        )
      : null;
  const worstMonth =
    meaningful.length > 0
      ? meaningful.reduce((worst, point) =>
          point.profitMinor < worst.profitMinor ? point : worst
        )
      : null;

  return {
    monthly,
    allTime,
    bestMonth,
    worstMonth,
    currency: CURRENCY,
  };
}

export async function getProfitOverview(): Promise<ProfitOverview> {
  await dbConnect();

  const [summaries, docs] = await Promise.all([
    listMonthlyRevenueSummaries(),
    ProfitReport.find({}).lean().exec(),
  ]);

  const reports: ProfitReportSettings[] = (docs ?? []).map((doc) => ({
    month: doc.month,
    paystackFeePercent: doc.paystackFeePercent,
    paystackFlatFeeMinor: doc.paystackFlatFeeMinor,
    expenses: doc.expenses ?? [],
  }));

  return buildProfitOverview(summaries, reports, monthKeyOfUtc(new Date()));
}

export async function sendProfitReportEmail(
  month: string,
  to: string[]
) {
  if (to.length === 0) {
    throw new ProfitReportServiceError(
      "Provide at least one recipient email",
      "NO_RECIPIENTS",
      400
    );
  }
  const mail = createMailAdapter();
  const calc = await getProfitReportForMonth(month);
  const variables = {
    month: calc.month,
    netMinor: String(calc.netMinor),
    paystackFeesMinor: String(calc.paystackFeesMinor),
    expensesTotalMinor: String(calc.expensesTotalMinor),
    profitMinor: String(calc.profitMinor),
  };
  await mail.sendTemplateEmail({ to: to[0], templateKey: "profit_report", variables });
  if (to.length > 1) {
    for (let i = 1; i < to.length; i += 1) {
      await mail.sendTemplateEmail({
        to: to[i],
        templateKey: "profit_report",
        variables,
      });
    }
  }
  return { ok: true };
}