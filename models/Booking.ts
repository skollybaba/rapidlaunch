import { Schema, model, models, type Model } from "mongoose";

import {
  BOOKING_PROVIDERS,
  BOOKING_STATUSES,
  type BookingDoc,
} from "@/types/booking";

const BookingSchema = new Schema<BookingDoc>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    customerName: { type: String, trim: true },
    answers: {
      whatYouAreBuilding: { type: String, trim: true },
      currentStage: { type: String, trim: true },
      helpNeeded: { type: String, trim: true },
    },
    timezone: { type: String, trim: true },
    requestedStartTime: { type: Date, default: null },
    scheduledStartTime: { type: Date, default: null },
    scheduledEndTime: { type: Date, default: null },
    provider: {
      type: String,
      enum: BOOKING_PROVIDERS,
      default: "manual",
    },
    providerBookingUri: String,
    providerEventUri: String,
    meetingUrl: String,
    schedulingUrl: String,
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "PENDING",
      index: true,
    },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    lastError: String,
    bookedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BookingSchema.index({ orderId: 1 }, { unique: true });
BookingSchema.index({ status: 1, createdAt: 1 });

export const Booking: Model<BookingDoc> =
  (models.Booking as Model<BookingDoc>) ||
  model<BookingDoc>("Booking", BookingSchema);

export default Booking;