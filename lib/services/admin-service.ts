import "server-only";

import { dbConnect } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import type { OrderDoc, OrderStatus } from "@/types/order";
import type { BookingDoc } from "@/types/booking";
import type { PaymentDoc } from "@/types/payment";

export interface AdminOrderRow {
  id: string;
  orderReference: string;
  customerEmail: string;
  itemTitle: string;
  status: OrderStatus;
  totalMinor: number;
  currency: string;
  paymentStatus?: string;
  bookingStatus?: string;
  paidAt?: string | null;
  createdAt: string;
  customerName?: string;
}

export interface DashboardSummary {
  revenueMinor: number;
  currency: string;
  paidOrders: number;
  totalOrders: number;
  pendingPayments: number;
  failedPayments: number;
  newCustomers: number;
  fulfillmentIssues: number;
  upcomingBookings: number;
  pendingBookings: number;
}

export interface AdminOrderQuery {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminOrderPage {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const CURRENCY = "NGN";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  await dbConnect();

  const [
    paidOrders,
    totalOrders,
    createdCount,
    newCustomers,
    fulfillmentIssues,
    upcomingBookings,
    pendingBookings,
  ] = await Promise.all([
    Order.countDocuments({ status: "PAID" }),
    Order.countDocuments({}),
    Order.countDocuments({ status: "PENDING" }),
    User.countDocuments({ role: { $ne: "admin" } }),
    Fulfillment.countDocuments({
      status: { $in: ["ACTION_REQUIRED", "FAILED", "RETRY_PENDING"] },
    }),
    Booking.countDocuments({
      status: { $in: ["CONFIRMED", "PENDING"] },
      scheduledStartTime: { $gte: new Date() },
    }),
    Booking.countDocuments({ status: "PENDING" }),
  ]);

  const paidAgg = await Order.aggregate<{ totalMinor: number }>([
    { $match: { status: "PAID", currency: CURRENCY } },
    { $group: { _id: null, totalMinor: { $sum: "$totalMinor" } } },
  ]);
  const revenueMinor =
    paidAgg.length > 0 ? Number(paidAgg[0].totalMinor ?? 0) : 0;

  const pendingPayments = await Payment.countDocuments({
    status: { $in: ["PENDING", "CREATED", "INITIALIZATION_FAILED"] },
  });
  const failedPayments = await Payment.countDocuments({
    status: { $in: ["FAILED", "ABANDONED", "SUSPICIOUS"] },
  });

  return {
    revenueMinor,
    currency: CURRENCY,
    paidOrders,
    totalOrders,
    pendingPayments,
    failedPayments,
    newCustomers: newCustomers + createdCount,
    fulfillmentIssues,
    upcomingBookings,
    pendingBookings,
  };
}

export async function getAdminOrders({
  q = "",
  status = "",
  page = 1,
  pageSize = 25,
}: AdminOrderQuery = {}): Promise<AdminOrderPage> {
  await dbConnect();

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const skip = (safePage - 1) * safePageSize;

  const filter: Record<string, unknown> = {};

  const trimmed = q.trim();
  if (trimmed) {
    const or: Record<string, unknown>[] = [
      { orderReference: { $regex: trimmed, $options: "i" } },
      { customerEmail: { $regex: trimmed, $options: "i" } },
    ];
    if (/^\d+$/.test(trimmed)) {
      or.push({ orderReference: { $regex: trimmed, $options: "i" } });
    }
    filter.$or = or;
  }

  if (status) {
    filter.status = status;
  }

  const [total, orders, payments, bookings] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safePageSize)
      .lean<OrderDoc[]>()
      .exec(),
    Payment.find({})
      .select("orderId status")
      .lean<PaymentDoc[]>()
      .exec(),
    Booking.find({})
      .select("orderId status customerName")
      .lean<BookingDoc[]>()
      .exec(),
  ]);

  const paymentMap = new Map<string, string>();
  for (const p of payments) paymentMap.set(String(p.orderId), p.status);

  const bookingMap = new Map<string, { status: string; customerName?: string }>();
  for (const b of bookings)
    bookingMap.set(String(b.orderId), {
      status: b.status,
      customerName: b.customerName,
    });

  const rows: AdminOrderRow[] = orders.map((o) => {
    const id = String(o._id);
    const booking = bookingMap.get(id);
    return {
      id,
      orderReference: o.orderReference,
      customerEmail: o.customerEmail,
      customerName: booking?.customerName,
      itemTitle: o.items[0]?.titleSnapshot ?? "Order",
      status: o.status,
      totalMinor: o.totalMinor,
      currency: o.currency,
      paymentStatus: paymentMap.get(id),
      bookingStatus: booking?.status,
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
      createdAt: (o.createdAt ?? new Date()).toISOString(),
    };
  });

  return {
    rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}
