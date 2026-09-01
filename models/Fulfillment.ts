import { Schema, models, model, type Model } from "mongoose";

import {
  FULFILLMENT_STATUSES,
  FULFILLMENT_TYPES,
  type FulfillmentDoc,
} from "@/types/payment";

const FulfillmentSchema = new Schema<FulfillmentDoc>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderItemId: { type: Schema.Types.ObjectId, default: null },
    type: {
      type: String,
      enum: FULFILLMENT_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: FULFILLMENT_STATUSES,
      default: "PENDING",
      index: true,
    },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    lastError: String,
    fulfilledAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

FulfillmentSchema.index({ orderId: 1, type: 1, orderItemId: 1 });
FulfillmentSchema.index({ status: 1, createdAt: 1 });

export const Fulfillment: Model<FulfillmentDoc> =
  (models.Fulfillment as Model<FulfillmentDoc>) ||
  model<FulfillmentDoc>("Fulfillment", FulfillmentSchema);

export default Fulfillment;