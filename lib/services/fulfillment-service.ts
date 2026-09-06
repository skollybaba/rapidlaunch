import "server-only";

import { dbConnect } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import type { OrderDoc } from "@/types/order";
import {
  bookConsultationIfPending,
  processCourseEnrollment,
  sendPaymentConfirmationEmail,
} from "@/lib/services/order-service";

type LeanDoc<T> = T & { __v?: number };

export interface FulfillmentRetryOutcome {
  orderId: string;
  confirmationEmailSent: boolean;
  courseEnrolled: boolean;
  bookingConfirmed: boolean;
}

export interface FulfillmentDispatchResult {
  processed: number;
  outcomes: FulfillmentRetryOutcome[];
}

const RETRY_THROTTLE_MS = 90_000;

export async function retryOrderFulfillment(
  orderId: string
): Promise<FulfillmentRetryOutcome> {
  await dbConnect();

  const order = await Order.findById(orderId).lean<LeanDoc<OrderDoc>>().exec();
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.status !== "PAID") {
    throw new Error("Only paid orders can be retried");
  }

  const outcome: FulfillmentRetryOutcome = {
    orderId: String(order._id),
    confirmationEmailSent: false,
    courseEnrolled: false,
    bookingConfirmed: false,
  };

  try {
    await processCourseEnrollment(order);
    outcome.courseEnrolled = Boolean(
      (await findFulfillment(order))?.status === "FULFILLED"
    );
  } catch (error) {
    console.error("Course enrollment retry failed", order.orderReference, {
      error,
    });
  }

  try {
    await bookConsultationIfPending(order);
    const booking = await Booking.findOne({
      orderId: order._id,
      dismissedAt: null,
    })
      .lean()
      .exec();
    outcome.bookingConfirmed = booking?.status === "CONFIRMED";
  } catch (error) {
    console.error("Consultation booking retry failed", order.orderReference, {
      error,
    });
  }

  try {
    await sendPaymentConfirmationEmail(order);
    const fresh = await Order.findById(order._id)
      .select("metadata")
      .lean()
      .exec();
    outcome.confirmationEmailSent = Boolean(
      (fresh?.metadata as Record<string, unknown> | undefined)
        ?.confirmationEmailSentAt
    );
  } catch (error) {
    console.error(
      "Confirmation email retry failed",
      order.orderReference,
      { error }
    );
  }

  await Order.updateOne(
    { _id: order._id },
    { $set: { "metadata.lastFulfillmentRetryAt": new Date() } }
  );

  return outcome;
}

async function findFulfillment(order: LeanDoc<OrderDoc>) {
  return Fulfillment.findOne({
    orderId: order._id,
    type: "CLASSROOM_ENROLLMENT",
  })
    .lean()
    .exec();
}

export async function dispatchFulfillmentRetries(): Promise<FulfillmentDispatchResult> {
  await dbConnect();

  const throttleCutoff = new Date(Date.now() - RETRY_THROTTLE_MS);

  const orders = await Order.find({
    status: "PAID",
    $or: [
      { "metadata.confirmationEmailSentAt": { $exists: false } },
      { "metadata.lastFulfillmentRetryAt": { $exists: false } },
      { "metadata.lastFulfillmentRetryAt": { $lt: throttleCutoff } },
    ],
  })
    .sort({ paidAt: -1 })
    .limit(50)
    .lean<LeanDoc<OrderDoc>[]>()
    .exec();

  const processed: FulfillmentRetryOutcome[] = [];

  for (const order of orders) {
    const outcome = await retryOrderFulfillment(String(order._id));
    processed.push(outcome);
  }

  return { processed: processed.length, outcomes: processed };
}
