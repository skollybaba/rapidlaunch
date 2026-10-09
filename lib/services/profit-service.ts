import "server-only";

import { createMailAdapter } from "@/lib/providers/mail";
import { ProfitReport } from "@/models/ProfitReport";
import { dbConnect } from "@/lib/db";
import {
  getMonthRevenueSummary,
  monthStart,
  monthEndExclusive,
} from "@/lib/services/metrics-service";
import { Order } from "@/models/Order";
import {
  ProfitCalculation,
  ProfitReportInput,
  ProfitReportSchema,
} from "@/types/profit";

export type { ProfitReportInput, ProfitReportSchema } from "@/types/profit";

const CURRENCY = "NGN";

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

function fmtMinor(n: number): string {
  return new Intl.NumberFormat("en-NG").format(Math.max(0, n));
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
        paystackFeePercent: 1.5,
        paystackFlatFeeMinor: 0,
        expenses: [],
      },
      summary
    );
  }
  return computeFromSummary(doc, summary);
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
  const subject = `Profit report for ${month} — ${fmtMinor(calc.profitMinor)} NGN`;
  const html = `
    <h1>Profit Report — ${month}</h1>
    <p>Revenue (net): ₦${fmtMinor(calc.netMinor)}</p>
    <p>Paystack fees: ₦${fmtMinor(calc.paystackFeesMinor)}</p>
    <p>Expenses: ₦${fmtMinor(calc.expensesTotalMinor)}</p>
    <p><strong>Profit: ₦${fmtMinor(calc.profitMinor)}</strong></p>
  `;
  const text = [
    `Profit Report — ${month}`,
    `Revenue (net): ${fmtMinor(calc.netMinor)} NGN`,
    `Paystack fees: ${fmtMinor(calc.paystackFeesMinor)} NGN`,
    `Expenses: ${fmtMinor(calc.expensesTotalMinor)} NGN`,
    `Profit: ${fmtMinor(calc.profitMinor)} NGN`,
  ].join("\n");
  await mail.sendTemplateEmail({
    to: to[0],
    templateKey: "profit_report",
    variables: {
      month: calc.month,
      netMinor: String(calc.netMinor),
      paystackFeesMinor: String(calc.paystackFeesMinor),
      expensesTotalMinor: String(calc.expensesTotalMinor),
      profitMinor: String(calc.profitMinor),
    },
  });
  if (to.length > 1) {
    for (let i = 1; i < to.length; i++) {
      await mail.sendTemplateEmail({
        to: to[i],
        templateKey: "profit_report",
        variables: {
          month: calc.month,
          netMinor: String(calc.netMinor),
          paystackFeesMinor: String(calc.paystackFeesMinor),
          expensesTotalMinor: String(calc.expensesTotalMinor),
          profitMinor: String(calc.profitMinor),
        },
      });
    }
  }
  return { ok: true };
}