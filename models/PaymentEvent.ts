import { Schema, models, model, type Model } from "mongoose";

import {
  PAYMENT_EVENT_PROCESSING_STATUSES,
  type PaymentEventDoc,
} from "@/types/payment";

const PaymentEventSchema = new Schema<PaymentEventDoc>(
  {
    provider: { type: String, required: true, default: "paystack" },
    providerEventKey: { type: String, required: true },
    eventType: { type: String, required: true },
    signatureValid: { type: Boolean, required: true, default: false },
    rawPayload: { type: Schema.Types.Mixed, required: true },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date, default: null },
    processingStatus: {
      type: String,
      enum: PAYMENT_EVENT_PROCESSING_STATUSES,
      required: true,
      default: "RECEIVED",
    },
    errorMessage: String,
  },
  { timestamps: true }
);

PaymentEventSchema.index(
  { provider: 1, providerEventKey: 1 },
  { unique: true }
);

export const PaymentEvent: Model<PaymentEventDoc> =
  (models.PaymentEvent as Model<PaymentEventDoc>) ||
  model<PaymentEventDoc>("PaymentEvent", PaymentEventSchema);

export default PaymentEvent;