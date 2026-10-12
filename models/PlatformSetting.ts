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
