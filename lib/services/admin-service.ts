import "server-only";

import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import { createMailAdapter } from "@/lib/providers/mail";
import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { productInputSchema } from "@/lib/validation/product";
import {
  curriculumUploadSchema,
  isPdfLike,
} from "@/lib/validation/curriculum";
import type { ProductCurriculumStored } from "@/types/product";
import type { OrderDoc, OrderStatus } from "@/types/order";
import type { BookingAnswers, BookingDoc } from "@/types/booking";
import type { BookingRange, BookingSort } from "@/types/booking";

export type { BookingRange } from "@/types/booking";
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
  range?: OrderRange;
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

export type OrderRange = "today" | "week";

export interface AdminOrderRangeStats {
  range: OrderRange;
  totalOrders: number;
  revenueMinor: number;
  paidOrders: number;
  pendingPayments: number;
  failedPayments: number;
  currency: string;
}

const BUSINESS_TIME_ZONE = "Africa/Lagos";

function startOfBusinessDay(now: Date): Date {
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const read = (parts: Intl.DateTimeFormatPart[]) =>
    new Map(parts.map((p) => [p.type, p.value]));
  const parts = format.formatToParts(now);
  const { year, month, day } = Object.fromEntries(
    Array.from(read(parts).entries()).filter(([k]) =>
      ["year", "month", "day"].includes(k)
    )
  );
  const guess = Date.UTC(Number(year), Number(month) - 1, Number(day));
  for (
    let offsetMs = -36 * 3_600_000;
    offsetMs <= 36 * 3_600_000;
    offsetMs += 3_600_000
  ) {
    const candidate = new Date(guess + offsetMs);
    const close = format.formatToParts(candidate);
    const v = read(close);
    if (
      v.get("year") === year &&
      v.get("month") === month &&
      v.get("day") === day &&
      v.get("hour") === "00" &&
      v.get("minute") === "00" &&
      v.get("second") === "00"
    ) {
      return candidate;
    }
  }
  return new Date(guess);
}

function startOfBusinessWeek(now: Date): Date {
  const todayStart = startOfBusinessDay(now);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "short",
  }).format(todayStart);
  const index =
    { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[weekday] ?? 1;
  return new Date(todayStart.getTime() - (index - 1) * 86_400_000);
}

export async function getOrderRangeStats(
  range: OrderRange
): Promise<AdminOrderRangeStats> {
  await dbConnect();

  const now = new Date();
  const from =
    range === "today" ? startOfBusinessDay(now) : startOfBusinessWeek(now);

  const [result] = await Order.aggregate<{
    totalOrders: number;
    revenueMinor: number;
    paidOrders: number;
    pendingPayments: number;
    failedPayments: number;
    currency: string;
  }>([
    { $match: { createdAt: { $gte: from } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        revenueMinor: {
          $sum: { $cond: [{ $eq: ["$status", "PAID"] }, "$totalMinor", 0] },
        },
        paidOrders: {
          $sum: { $cond: [{ $eq: ["$status", "PAID"] }, 1, 0] },
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
        },
        failedPayments: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$status",
                  ["FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
                ],
              },
              1,
              0,
            ],
          },
        },
        currency: { $first: "$currency" },
      },
    },
  ]);

  return {
    range,
    totalOrders: result?.totalOrders ?? 0,
    revenueMinor: result?.revenueMinor ?? 0,
    paidOrders: result?.paidOrders ?? 0,
    pendingPayments: result?.pendingPayments ?? 0,
    failedPayments: result?.failedPayments ?? 0,
    currency: result?.currency ?? CURRENCY,
  };
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
    Booking.countDocuments({
      status: "PENDING",
      dismissedAt: null,
    }),
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

export interface NextSessionRow {
  id: string;
  scheduledStartTime: string;
  productTitle: string;
  customerEmail: string;
  customerName?: string;
  status: string;
}

export interface NextUpcomingSession {
  session: NextSessionRow | null;
}

export async function getNextUpcomingSession(): Promise<NextUpcomingSession> {
  await dbConnect();

  const now = new Date();

  const filter: Record<string, unknown> = {
    status: { $in: ["CONFIRMED", "PENDING"] },
    scheduledStartTime: { $gte: now },
    dismissedAt: null,
  };

  const [booking, products] = await Promise.all([
    Booking.findOne(filter)
      .sort({ scheduledStartTime: 1 })
      .lean<BookingDoc | null>()
      .exec(),
    Product.find({}).select("_id title").lean().exec(),
  ]);

  const productTitleMap = new Map<string, string>();
  for (const p of products) productTitleMap.set(String(p._id), p.title);

  if (!booking || !booking.scheduledStartTime) return { session: null };

  const session: NextSessionRow = {
    id: String(booking._id),
    scheduledStartTime: booking.scheduledStartTime.toISOString(),
    productTitle: booking.productId
      ? (productTitleMap.get(String(booking.productId)) ?? "Session")
      : "Session",
    customerEmail: booking.customerEmail,
    customerName: booking.customerName ?? undefined,
    status: booking.status,
  };

  return { session };
}

export async function getAdminOrders({
  q = "",
  status = "",
  range,
  page = 1,
  pageSize = 25,
}: AdminOrderQuery = {}): Promise<AdminOrderPage> {
  await dbConnect();

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const skip = (safePage - 1) * safePageSize;

  const filter: Record<string, unknown> = {};

  if (range === "today" || range === "week") {
    const now = new Date();
    filter.createdAt = {
      $gte:
        range === "today" ? startOfBusinessDay(now) : startOfBusinessWeek(now),
    };
  }

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
    Booking.find({ dismissedAt: null })
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

export interface AdminUserRow {
  id: string;
  email: string;
  name?: string;
  role: string;
  provider?: string;
  createdAt: string;
  orderCount: number;
  paidCount: number;
}

export interface AdminUserPage {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminUserQuery {
  q?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminUsers({
  q = "",
  role = "",
  page = 1,
  pageSize = 25,
}: AdminUserQuery = {}): Promise<AdminUserPage> {
  await dbConnect();

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const skip = (safePage - 1) * safePageSize;

  const filter: Record<string, unknown> = {};
  const trimmed = q.trim();
  if (trimmed) {
    filter.$or = [
      { email: { $regex: trimmed, $options: "i" } },
      { name: { $regex: trimmed, $options: "i" } },
    ];
  }
  if (role) filter.role = role;

  const [total, users, orderAgg] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safePageSize)
      .select("_id email name role provider createdAt")
      .lean()
      .exec(),
    Order.aggregate<{ _id: unknown; orders: number; paid: number }>([
      { $group: { _id: "$userId", orders: { $sum: 1 }, paid: { $sum: { $cond: [{ $eq: ["$status", "PAID"] }, 1, 0] } } } },
    ]),
  ]);

  const orderCounts = new Map<string, { orders: number; paid: number }>();
  for (const item of orderAgg) {
    const id = item._id ? String(item._id) : "";
    if (id) orderCounts.set(id, { orders: item.orders, paid: item.paid });
  }

  const rows: AdminUserRow[] = users.map((u) => {
    const counts = orderCounts.get(String(u._id)) ?? { orders: 0, paid: 0 };
    return {
      id: String(u._id),
      email: u.email,
      name: u.name,
      role: u.role,
      provider: u.provider,
      createdAt: (u.createdAt ?? new Date()).toISOString(),
      orderCount: counts.orders,
      paidCount: counts.paid,
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

export interface AdminBookingRow {
  id: string;
  orderId: string;
  orderReference?: string;
  orderStatus?: string;
  paymentReference?: string;
  paymentStatus?: string;
  customerName?: string;
  customerEmail: string;
  productTitle?: string;
  status: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  requestedStartTime?: string | null;
  meetingUrl?: string;
  providerEventUri?: string;
  schedulingUrl?: string;
  timezone?: string;
  answers?: BookingAnswers;
  createdAt: string;
}

interface LeanOrderRef {
  _id: unknown;
  status: string;
  orderReference: string;
}

interface LeanPaymentRef {
  orderId: unknown;
  providerReference: string;
  status: string;
}

export interface AdminBookingPage {
  rows: AdminBookingRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminBookingQuery {
  status?: string;
  range?: BookingRange;
  sort?: BookingSort;
  page?: number;
  pageSize?: number;
}

export async function getAdminBookings({
  status = "",
  range,
  sort = "schedule",
  page = 1,
  pageSize = 25,
}: AdminBookingQuery = {}): Promise<AdminBookingPage> {
  await dbConnect();

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const skip = (safePage - 1) * safePageSize;

  const filter: Record<string, unknown> = {
    dismissedAt: null,
  };
  if (status) filter.status = status;

  const now = new Date();
  const horizonDays =
    range === "next7" ? 7 : range === "next30" ? 30 : range === "next365" ? 365 : 0;

  if (range === "upcoming") {
    filter.$or = [
      { scheduledStartTime: null },
      { scheduledStartTime: { $gte: now } },
    ];
  } else if (range === "past") {
    filter.scheduledStartTime = { $lt: now };
  } else if (horizonDays > 0) {
    filter.scheduledStartTime = {
      $gte: now,
      $lte: new Date(now.getTime() + horizonDays * 86_400_000),
    };
  }

  const [total, bookings, products] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.aggregate<BookingDoc & { __sortKey: number }>([
      { $match: filter },
      ...(sort === "recent"
        ? ([{ $sort: { createdAt: -1, _id: -1 } }] as const)
        : ([
            {
              $addFields: {
                __sortKey: {
                  $switch: {
                    branches: [
                      {
                        case: {
                          $and: [
                            { $ne: ["$scheduledStartTime", null] },
                            { $gte: ["$scheduledStartTime", now] },
                          ],
                        },
                        then: { $toLong: "$scheduledStartTime" },
                      },
                      {
                        case: {
                          $eq: [{ $type: "$scheduledStartTime" }, "null"],
                        },
                        then: 9_007_199_254_740_991,
                      },
                    ],
                    default: { $multiply: [-1, { $toLong: "$scheduledStartTime" }] },
                  },
                },
              },
            },
            { $sort: { __sortKey: 1, createdAt: -1 } },
          ] as const)),
      { $skip: skip },
      { $limit: safePageSize },
    ]),
    Product.find({}).select("_id title").lean().exec(),
  ]);

  const productMap = new Map<string, string>();
  for (const p of products) productMap.set(String(p._id), p.title);

  const orderIds = bookings
    .map((b) => b.orderId)
    .filter((id): id is NonNullable<typeof id> => id != null);

  const [orders, payments] = await Promise.all([
    orderIds.length > 0
      ? Order.find({ _id: { $in: orderIds } })
          .select("_id status orderReference")
          .lean<LeanOrderRef[]>()
          .exec()
      : [],
    orderIds.length > 0
      ? Payment.find({ orderId: { $in: orderIds } })
          .select("orderId providerReference status")
          .lean<LeanPaymentRef[]>()
          .exec()
      : [],
  ]);

  const orderMap = new Map<string, LeanOrderRef>();
  for (const o of orders) orderMap.set(String(o._id), o);

  const paymentByOrder = new Map<string, LeanPaymentRef>();
  for (const p of payments) paymentByOrder.set(String(p.orderId), p);

  const rows: AdminBookingRow[] = bookings.map((b) => {
    const order = orderMap.get(String(b.orderId));
    const payment = paymentByOrder.get(String(b.orderId));
    return {
      id: String(b._id),
      orderId: String(b.orderId),
      orderReference: order?.orderReference,
      orderStatus: order?.status,
      paymentReference: payment?.providerReference,
      paymentStatus: payment?.status,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      productTitle: b.productId ? productMap.get(String(b.productId)) : undefined,
      status: b.status,
      scheduledStartTime: b.scheduledStartTime
        ? b.scheduledStartTime.toISOString()
        : null,
      scheduledEndTime: b.scheduledEndTime
        ? b.scheduledEndTime.toISOString()
        : null,
      requestedStartTime: b.requestedStartTime
        ? b.requestedStartTime.toISOString()
        : null,
      meetingUrl: b.meetingUrl,
      providerEventUri: b.providerEventUri,
      schedulingUrl: b.schedulingUrl,
      timezone: b.timezone,
      answers: b.answers
        ? {
            whatYouAreBuilding: b.answers.whatYouAreBuilding,
            currentStage: b.answers.currentStage,
            helpNeeded: b.answers.helpNeeded,
          }
        : undefined,
      createdAt: (b.createdAt ?? new Date()).toISOString(),
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

export async function dismissBooking(bookingId: string) {
  await dbConnect();

  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId },
    { $set: { dismissedAt: new Date() } },
    { new: true }
  )
    .select("_id orderId status dismissedAt")
    .lean()
    .exec();

  if (!updated) {
    throw new AdminServiceError("BOOKING_NOT_FOUND", "Booking not found.", 404);
  }

  return { id: String(updated._id) };
}

export async function sendBookingPaymentReminder(bookingId: string) {
  await dbConnect();

  const booking = await Booking.findById(bookingId).lean().exec();
  if (!booking) {
    throw new AdminServiceError("BOOKING_NOT_FOUND", "Booking not found.", 404);
  }
  if (!booking.orderId) {
    throw new AdminServiceError(
      "BOOKING_HAS_NO_ORDER",
      "This booking has no linked order.",
      400
    );
  }

  const order = await Order.findById(booking.orderId)
    .select("_id status orderReference customerEmail items")
    .lean()
    .exec();
  if (!order) {
    throw new AdminServiceError("ORDER_NOT_FOUND", "Order not found.", 404);
  }
  if (order.status === "PAID") {
    throw new AdminServiceError(
      "ORDER_ALREADY_PAID",
      "This order has already been paid — no reminder needed.",
      409
    );
  }

  const email = order.customerEmail || booking.customerEmail;
  if (!email) {
    throw new AdminServiceError(
      "NO_CUSTOMER_EMAIL",
      "No customer email is available for this booking.",
      400
    );
  }

  const itemTitle = order.items?.[0]?.titleSnapshot || "your purchase";
  const productId = booking.productId ?? order.items?.[0]?.productId;
  const checkoutUrl = productId
    ? `${env.NEXT_PUBLIC_APP_URL}/checkout/${String(productId)}`
    : "";

  const adapter = createMailAdapter();
  try {
    await adapter.sendTemplateEmail({
      templateKey: "payment_reminder",
      to: email,
      variables: {
        itemTitle,
        customerName: booking.customerName ?? "",
        checkoutUrl,
      },
    });
  } catch (error) {
    console.error("Payment reminder email failed to send", email, { error });
    throw new AdminServiceError(
      "MAIL_SEND_FAILED",
      "The reminder email could not be sent. Try again shortly.",
      500
    );
  }

  await Booking.updateOne(
    { _id: booking._id },
    { $set: { lastReminderSentAt: new Date() } }
  );

  return {
    id: String(booking._id),
    sentAt: new Date().toISOString(),
    to: email,
    checkoutUrl,
  };
}

export interface AdminCourseRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  priceMinor: number;
  currency: string;
  featured: boolean;
  hasCurriculum: boolean;
  updatedAt: string;
}

export interface AdminCoursePage {
  rows: AdminCourseRow[];
  total: number;
}

export async function getAdminCourses({
  q = "",
  status = "",
}: { q?: string; status?: string } = {}): Promise<AdminCoursePage> {
  await dbConnect();
  const filter: Record<string, unknown> = { type: "COURSE" };
  const trimmed = q.trim();
  if (trimmed) {
    filter.$or = [
      { title: { $regex: trimmed, $options: "i" } },
      { slug: { $regex: trimmed, $options: "i" } },
    ];
  }
  if (status) filter.status = status;

  const [total, courses] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort({ updatedAt: -1 })
      .select("_id slug title status priceMinor currency featured curriculum.fileName updatedAt")
      .lean()
      .exec(),
  ]);

  const rows: AdminCourseRow[] = courses.map((c) => ({
    id: String(c._id),
    slug: c.slug,
    title: c.title,
    status: c.status,
    priceMinor: c.priceMinor,
    currency: c.currency,
    featured: c.featured,
    hasCurriculum: Boolean(c.curriculum?.fileName),
    updatedAt: (c.updatedAt ?? new Date()).toISOString(),
  }));

  return { rows, total };
}

export async function getCourseById(id: string) {
  await dbConnect();
  return Product.findById(id)
    .select("_id slug title shortDescription description status priceMinor currency fulfillmentMode thumbnailUrl featured sortOrder courseDetails bundleCourseIds curriculum.fileName curriculum.contentType curriculum.size curriculum.uploadedAt")
    .lean()
    .exec();
}

export interface CourseBundleChoice {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export async function getCourseBundleChoices(): Promise<CourseBundleChoice[]> {
  await dbConnect();
  const courses = await Product.find({
    type: "COURSE",
    status: { $ne: "ARCHIVED" },
  })
    .sort({ title: 1 })
    .select("_id title slug status")
    .lean()
    .exec();

  return courses.map((c) => ({
    id: String(c._id),
    title: c.title,
    slug: c.slug,
    status: c.status,
  }));
}

async function resolveBundleCourseIds(
  courseIds: string[],
  excludeId?: string
): Promise<string[]> {
  const unique = [...new Set(courseIds.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return [];

  const docs = await Product.find({
    _id: { $in: unique },
    type: "COURSE",
    status: { $ne: "ARCHIVED" },
  })
    .select("_id")
    .lean()
    .exec();

  const valid = new Set(docs.map((d) => String(d._id)));
  return unique.filter(
    (id) => valid.has(id) && (excludeId ? id !== String(excludeId) : true)
  );
}

export async function createCourse(input: unknown) {
  const parsed = productInputSchema.parse({
    ...(input as Record<string, unknown>),
    type: "COURSE",
  });
  await dbConnect();
  const existing = await Product.findOne({ slug: parsed.slug }).select("_id").lean().exec();
  if (existing) {
    throw new AdminServiceError(
      "SLUG_IN_USE",
      "A product with this slug already exists.",
      409
    );
  }
  parsed.bundleCourseIds = await resolveBundleCourseIds(parsed.bundleCourseIds);
  return Product.create(parsed);
}

export async function updateCourse(id: string, input: unknown) {
  const parsed = productInputSchema.parse({
    ...(input as Record<string, unknown>),
    type: "COURSE",
  });
  await dbConnect();
  const slugExists = await Product.findOne({
    slug: parsed.slug,
    _id: { $ne: id },
  })
    .select("_id")
    .lean()
    .exec();
  if (slugExists) {
    throw new AdminServiceError(
      "SLUG_IN_USE",
      "A product with this slug already exists.",
      409
    );
  }
  parsed.bundleCourseIds = await resolveBundleCourseIds(
    parsed.bundleCourseIds,
    id
  );
  const updated = await Product.findByIdAndUpdate(id, { $set: parsed }, { new: true })
    .select("_id slug title status")
    .lean()
    .exec();
  if (!updated) {
    throw new AdminServiceError("COURSE_NOT_FOUND", "Course not found.", 404);
  }
  return updated;
}

export interface SetCourseCurriculumInput {
  fileName: string;
  contentType: string;
  size: number;
  data: Buffer;
}

export async function setCourseCurriculum(id: string, input: SetCourseCurriculumInput) {
  const parsed = curriculumUploadSchema.parse({
    fileName: input.fileName,
    size: input.size,
  });
  if (!isPdfLike(parsed.fileName, input.contentType)) {
    throw new AdminServiceError(
      "INVALID_CURRICULUM_FILE",
      "Curriculum must be a PDF file.",
      400
    );
  }
  await dbConnect();
  const stored: ProductCurriculumStored = {
    fileName: parsed.fileName,
    contentType: "application/pdf",
    size: parsed.size,
    data: input.data,
    uploadedAt: new Date(),
  };
  const updated = await Product.findOneAndUpdate(
    { _id: id, type: "COURSE" },
    { $set: { curriculum: stored } },
    { new: true }
  )
    .select("_id")
    .lean()
    .exec();
  if (!updated) {
    throw new AdminServiceError("COURSE_NOT_FOUND", "Course not found.", 404);
  }
  return { id: String(updated._id) };
}

export async function clearCourseCurriculum(id: string) {
  await dbConnect();
  const updated = await Product.findOneAndUpdate(
    { _id: id, type: "COURSE" },
    { $unset: { curriculum: 1 } },
    { new: true }
  )
    .select("_id")
    .lean()
    .exec();
  if (!updated) {
    throw new AdminServiceError("COURSE_NOT_FOUND", "Course not found.", 404);
  }
  return { id: String(updated._id) };
}

export class AdminServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AdminServiceError";
    this.code = code;
    this.status = status;
  }
}

export interface EnrolleeRow {
  enrollmentId: string;
  productId?: string;
  courseTitle?: string;
  customerEmail: string;
  customerName?: string;
  orderId: string;
  orderReference: string;
  status: string;
  enrolledAt?: string | null;
}

export interface CourseEnrolleesGroup {
  productId: string;
  courseTitle: string;
  enrollees: EnrolleeRow[];
}

export async function getCourseEnrollees(): Promise<CourseEnrolleesGroup[]> {
  await dbConnect();

  const [courses, fulfillments, orders] = await Promise.all([
    Product.find({ type: "COURSE" })
      .select("_id title")
      .lean()
      .exec(),
    Fulfillment.find({ type: "CLASSROOM_ENROLLMENT" })
      .sort({ fulfilledAt: -1 })
      .select("orderId status fulfilledAt lastError metadata orderItemId")
      .lean()
      .exec(),
    Order.find({})
      .select("_id orderReference customerEmail userId items")
      .lean()
      .exec(),
  ]);

  const courseTitleMap = new Map<string, string>();
  for (const c of courses) courseTitleMap.set(String(c._id), c.title);

  const orderById = new Map<string, (typeof orders)[number]>();
  for (const o of orders) orderById.set(String(o._id), o);

  const groupsMap = new Map<string, CourseEnrolleesGroup>();

  for (const f of fulfillments) {
    const order = orderById.get(String(f.orderId));
    if (!order) continue;

    const meta = (f.metadata ?? {}) as Record<string, unknown>;
    const isBonus = meta.bonusCourse === true;

    const productId = f.orderItemId
      ? String(f.orderItemId)
      : order.items[0]?.productId
        ? String(order.items[0].productId)
        : meta.productId
          ? String(meta.productId)
          : "";

    const courseTitle = isBonus && typeof meta.courseName === "string"
      ? meta.courseName
      : productId
        ? courseTitleMap.get(productId)
        : typeof meta.courseTitle === "string"
          ? meta.courseTitle
          : undefined;

    const key = productId || "unknown";
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        productId: key,
        courseTitle: courseTitle ?? "Course",
        enrollees: [],
      });
    }

    groupsMap.get(key)!.enrollees.push({
      enrollmentId: String(f._id),
      productId,
      courseTitle,
      customerEmail: order.customerEmail,
      customerName: undefined,
      orderId: String(order._id),
      orderReference: order.orderReference,
      status: f.status,
      enrolledAt: f.fulfilledAt ? f.fulfilledAt.toISOString() : null,
    });
  }

  const groups = Array.from(groupsMap.values());

  const withEnrollees = groups.filter((g) => g.productId !== "unknown");
  const unknown = groups.find((g) => g.productId === "unknown");
  if (unknown) withEnrollees.push(unknown);

  for (const g of withEnrollees) {
    g.enrollees.sort((a, b) => {
      const ta = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
      const tb = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
      return tb - ta;
    });
  }

  return withEnrollees;
}
