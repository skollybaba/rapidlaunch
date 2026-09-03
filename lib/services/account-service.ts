import "server-only";

import { dbConnect } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import type { BookingDoc } from "@/types/booking";
import type { FulfillmentDoc } from "@/types/payment";
import type { OrderDoc } from "@/types/order";

export interface AccountPurchase {
  id: string;
  orderReference: string;
  status: string;
  itemTitle: string;
  type: string;
  totalMinor: number;
  currency: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface AccountSession {
  id: string;
  orderReference: string;
  productId: string;
  productTitle: string;
  status: string;
  requestedStartTime?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  meetingUrl?: string | null;
  timezone?: string | null;
  isUpcoming: boolean;
}

export interface AccountCourse {
  id: string;
  orderReference: string;
  title: string;
  priceMinor: number;
  currency: string;
  purchasedAt: string;
  enrollmentId?: string;
  enrollmentStatus: string;
  courseUrl?: string;
  courseId?: string;
}

export async function getCoursesForUser(
  userId: string
): Promise<AccountCourse[]> {
  await dbConnect();

  const orders = await Order.find({
    userId,
    status: "PAID",
    "metadata.productType": "COURSE",
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  if (!orders.length) return [];

  const orderIds = orders.map((order) => order._id);
  const fulfillments = await Fulfillment.find({
    orderId: { $in: orderIds },
    type: "CLASSROOM_ENROLLMENT",
  })
    .lean()
    .exec();

  const fulfillmentByOrder = new Map<string, FulfillmentDoc>(
    fulfillments.map((f) => [String(f.orderId), f])
  );

  return orders.map((order: OrderDoc) => {
    const fulfillment = fulfillmentByOrder.get(String(order._id));
    const meta = (fulfillment?.metadata ?? {}) as Record<string, unknown>;
    return {
      id: String(order._id),
      orderReference: order.orderReference,
      title: order.items[0]?.titleSnapshot ?? "Course",
      priceMinor: order.totalMinor,
      currency: order.currency,
      purchasedAt: order.createdAt
        ? new Date(order.createdAt).toISOString()
        : new Date().toISOString(),
      enrollmentId:
        typeof meta.studentId === "string" ? meta.studentId : undefined,
      enrollmentStatus: fulfillment?.status ?? "PENDING",
      courseUrl:
        typeof meta.courseAltLink === "string" ? meta.courseAltLink : undefined,
      courseId: typeof meta.courseId === "string" ? meta.courseId : undefined,
    };
  });
}

export async function getPurchasesForUser(userId: string): Promise<AccountPurchase[]> {
  await dbConnect();

  const orders = await Order.find({ userId, status: "PAID" })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return orders.map((order: OrderDoc) => ({
    id: String(order._id),
    orderReference: order.orderReference,
    status: order.status,
    itemTitle: order.items[0]?.titleSnapshot ?? "Purchase",
    type: order.items[0]?.typeSnapshot ?? "PRODUCT",
    totalMinor: order.totalMinor,
    currency: order.currency,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    createdAt: order.createdAt
      ? order.createdAt.toISOString()
      : new Date().toISOString(),
  }));
}

export async function getSessionsForUser(
  userId: string
): Promise<AccountSession[]> {
  await dbConnect();

  const orders = await Order.find({ userId }).select("_id").lean().exec();
  const orderIds = orders.map((order) => order._id);
  if (!orderIds.length) return [];

  const bookings = await Booking.find({ orderId: { $in: orderIds } })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const productIds = bookings.map((b) => b.productId);
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } })
        .select("_id title")
        .lean()
        .exec()
    : [];
  const productMap = new Map(
    products.map((p) => [String(p._id), p.title as string])
  );
  const orderMap = new Map(
    orders.map((o: OrderDoc) => [String(o._id), o.orderReference])
  );

  const now = Date.now();

  return bookings.map((booking: BookingDoc) => {
    const scheduled = booking.scheduledStartTime
      ? booking.scheduledStartTime.toISOString()
      : null;
    return {
      id: String(booking._id),
      orderReference: orderMap.get(String(booking.orderId)) ?? "",
      productId: String(booking.productId),
      productTitle: productMap.get(String(booking.productId)) ?? "Session",
      status: booking.status,
      requestedStartTime: booking.requestedStartTime
        ? booking.requestedStartTime.toISOString()
        : null,
      scheduledStartTime: scheduled,
      scheduledEndTime: booking.scheduledEndTime
        ? booking.scheduledEndTime.toISOString()
        : null,
      meetingUrl: booking.meetingUrl ?? null,
      timezone: booking.timezone ?? null,
      isUpcoming: scheduled ? new Date(scheduled).getTime() > now : false,
    };
  });
}
