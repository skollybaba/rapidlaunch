import { Schema, model, type Model } from "mongoose";

import { PAYMENT_PROVIDERS } from "@/types/payment";
import type { PlatformSettingDoc } from "@/types/settings";

const PlatformSettingSchema = new Schema<PlatformSettingDoc>(
  {
    key: { type: String, required: true, unique: true },
    paymentProvider: {
      type: String,
      enum: PAYMENT_PROVIDERS,
      default: "paystack",
    },
    displayCurrency: {
      type: String,
      enum: ["NGN", "USD", "AUTO", "LOCATION"],
      default: "AUTO",
    },
    ngnPerUsd: {
      type: Number,
      min: 0.000001,
      default: 1600,
    },
    usdPerNaira: {
      type: Number,
      min: 0.000001,
    },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const PlatformSetting: Model<PlatformSettingDoc> = model<PlatformSettingDoc>(
  "PlatformSetting",
  PlatformSettingSchema,
  undefined,
  { overwriteModels: true }
);

export default PlatformSetting;
