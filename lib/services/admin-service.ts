import "server-only";

import { dbConnect } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { productInputSchema } from "@/lib/validation/product";
import type { OrderDoc, OrderStatus } from "@/types/order";
import type { BookingAnswers, BookingDoc } from "@/types/booking";
import type { BookingRange } from "@/types/booking";

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

export interface NextSessionRow {
  id: string;
  scheduledStartTime: string;
  productTitle: string;
  customerEmail: string;
  customerName?: string;
  status: string;
}

export interface SessionsNext24h {
  count: number;
  rows: NextSessionRow[];
}

export async function getSessionsNext24h(): Promise<SessionsNext24h> {
  await dbConnect();

  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const filter: Record<string, unknown> = {
    status: { $in: ["CONFIRMED", "PENDING"] },
    scheduledStartTime: { $gte: now, $lte: horizon },
  };

  const [count, bookings, products] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .sort({ scheduledStartTime: 1 })
      .limit(3)
      .lean<BookingDoc[]>()
      .exec(),
    Product.find({}).select("_id title").lean().exec(),
  ]);

  const productTitleMap = new Map<string, string>();
  for (const p of products) productTitleMap.set(String(p._id), p.title);

  const rows: NextSessionRow[] = bookings.map((b) => ({
    id: String(b._id),
    scheduledStartTime: b.scheduledStartTime!.toISOString(),
    productTitle: b.productId
      ? (productTitleMap.get(String(b.productId)) ?? "Session")
      : "Session",
    customerEmail: b.customerEmail,
    customerName: b.customerName ?? undefined,
    status: b.status,
  }));

  return { count, rows };
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
  page?: number;
  pageSize?: number;
}

export async function getAdminBookings({
  status = "",
  range,
  page = 1,
  pageSize = 25,
}: AdminBookingQuery = {}): Promise<AdminBookingPage> {
  await dbConnect();

  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const skip = (safePage - 1) * safePageSize;

  const filter: Record<string, unknown> = {};
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
      { $skip: skip },
      { $limit: safePageSize },
    ]),
    Product.find({}).select("_id title").lean().exec(),
  ]);

  const productMap = new Map<string, string>();
  for (const p of products) productMap.set(String(p._id), p.title);

  const rows: AdminBookingRow[] = bookings.map((b) => ({
    id: String(b._id),
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
  }));

  return {
    rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
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
      .select("_id slug title status priceMinor currency featured updatedAt")
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
    updatedAt: (c.updatedAt ?? new Date()).toISOString(),
  }));

  return { rows, total };
}

export async function getCourseById(id: string) {
  await dbConnect();
  return Product.findById(id)
    .select("_id slug title shortDescription description status priceMinor currency fulfillmentMode thumbnailUrl featured sortOrder courseDetails")
    .lean()
    .exec();
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
  const updated = await Product.findByIdAndUpdate(id, { $set: parsed }, { new: true })
    .select("_id slug title status")
    .lean()
    .exec();
  if (!updated) {
    throw new AdminServiceError("COURSE_NOT_FOUND", "Course not found.", 404);
  }
  return updated;
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
      .select("orderId status fulfilledAt lastError metadata")
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

    const productId = order.items[0]?.productId
      ? String(order.items[0].productId)
      : (f.metadata as { productId?: string } | null)?.productId;

    const courseTitle = productId
      ? courseTitleMap.get(productId)
      : (f.metadata as { courseTitle?: string } | null)?.courseTitle;

    const key = productId ?? "unknown";
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
