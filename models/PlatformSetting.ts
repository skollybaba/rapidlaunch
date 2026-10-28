import { Schema, model, type Model } from "mongoose";

import { PAYMENT_PROVIDER_SETTINGS } from "@/types/payment";
import type { PlatformSettingDoc } from "@/types/settings";

const PlatformSettingSchema = new Schema<PlatformSettingDoc>(
  {
    key: { type: String, required: true, unique: true },
    paymentProvider: {
      type: String,
      enum: PAYMENT_PROVIDER_SETTINGS,
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
    profileImageUrl: { type: String, trim: true },
    profileImageKey: { type: String, trim: true },
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
