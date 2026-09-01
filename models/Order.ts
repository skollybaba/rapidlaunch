import { Schema, models, model, type Model } from "mongoose";

import { ORDER_STATUSES, type OrderDoc, type OrderItemDoc } from "@/types/order";
import { PRODUCT_TYPES } from "@/types/product";

const OrderItemSchema = new Schema<OrderItemDoc>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    titleSnapshot: { type: String, required: true, trim: true },
    typeSnapshot: {
      type: String,
      enum: PRODUCT_TYPES,
      required: true,
    },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDoc>(
  {
    orderReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "PENDING",
      index: true,
    },
    items: { type: [OrderItemSchema], default: [] },
    subtotalMinor: { type: Number, required: true, min: 0 },
    discountMinor: { type: Number, required: true, min: 0, default: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "NGN", uppercase: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OrderSchema.index({ customerEmail: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

export const Order: Model<OrderDoc> =
  (models.Order as Model<OrderDoc>) || model<OrderDoc>("Order", OrderSchema);

export default Order;