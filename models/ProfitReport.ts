import { Schema, model, type Model } from "mongoose";

import { EXPENSE_CATEGORIES, type ProfitReportDoc } from "@/types/profit";

const ExpenseSchema = new Schema<ProfitReportDoc["expenses"][number]>(
  {
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    label: { type: String, trim: true, maxlength: 120 },
    amountMinor: { type: Number, required: true, min: 0, max: 10_000_000_000 },
  },
  { _id: false }
);

const ProfitReportSchema = new Schema<ProfitReportDoc>(
  {
    month: { type: String, required: true, unique: true },
    paystackFeePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
      default: 1.5,
    },
    paystackFlatFeeMinor: {
      type: Number,
      required: true,
      min: 0,
      max: 10_000_000,
      default: 0,
    },
    expenses: { type: [ExpenseSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

export const ProfitReport: Model<ProfitReportDoc> = model<ProfitReportDoc>(
  "ProfitReport",
  ProfitReportSchema,
  undefined,
  { overwriteModels: true }
);

export default ProfitReport;
