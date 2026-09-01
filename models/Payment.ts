import { Schema, models, model, type Model } from "mongoose";

import { PAYMENT_STATUSES, type PaymentDoc } from "@/types/payment";

const PaymentSchema = new Schema<PaymentDoc>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    provider: { type: String, required: true, default: "paystack" },
    providerReference: { type: String, required: true },
    authorizationUrl: String,
    accessCode: String,
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "PENDING",
      index: true,
    },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "NGN", uppercase: true },
    verificationPayload: { type: Schema.Types.Mixed },
    paidAt: { type: Date, default: null },
    errorMessage: String,
  },
  { timestamps: true }
);

PaymentSchema.index(
  { provider: 1, providerReference: 1 },
  { unique: true, sparse: true }
);

export const Payment: Model<PaymentDoc> =
  (models.Payment as Model<PaymentDoc>) ||
  model<PaymentDoc>("Payment", PaymentSchema);

export default Payment;