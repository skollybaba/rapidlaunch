import { Schema, model, type Model } from "mongoose";

import { ANALYTICS_EVENT_TYPES, type AnalyticsEventDoc } from "@/types/analytics";

const AnalyticsEventSchema = new Schema<AnalyticsEventDoc>(
  {
    eventType: {
      type: String,
      enum: ANALYTICS_EVENT_TYPES,
      required: true,
      index: true,
    },
    eventKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    productId: { type: String, default: null, index: true },
    productType: { type: String, default: null },
    customerEmail: { type: String, default: null, lowercase: true, trim: true },
    userId: { type: String, default: null, index: true },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AnalyticsEventSchema.index({ eventType: 1, occurredAt: -1 });
AnalyticsEventSchema.index({ eventType: 1, productId: 1, occurredAt: -1 });
AnalyticsEventSchema.index({ occurredAt: -1, eventType: 1 });

export const AnalyticsEvent: Model<AnalyticsEventDoc> = model<AnalyticsEventDoc>(
  "AnalyticsEvent",
  AnalyticsEventSchema,
  undefined,
  { overwriteModels: true }
);

export default AnalyticsEvent;