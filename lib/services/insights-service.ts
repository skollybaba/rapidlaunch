import "server-only";

import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { dbConnect } from "@/lib/db";

const CURRENCY = "NGN";

export const INSIGHTS_PERIODS = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export type InsightsPeriod = (typeof INSIGHTS_PERIODS)[number];

interface PeriodConfig {
  unit: "day" | "week" | "month" | "year";
  buckets: number;
  windowDescription: string;
  truncate: (d: Date) => Date;
  label: (d: Date) => string;
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcWeek(d: Date) {
  const start = startOfUtcDay(d);
  const delta = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - delta);
  return start;
}

function shortDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

const PERIODS: Record<InsightsPeriod, PeriodConfig> = {
  daily: {
    unit: "day",
    buckets: 30,
    windowDescription: "Last 30 days",
    truncate: startOfUtcDay,
    label: shortDate,
  },
  weekly: {
    unit: "week",
    buckets: 12,
    windowDescription: "Last 12 weeks",
    truncate: startOfUtcWeek,
    label: (d) => `w/c ${shortDate(d)}`,
  },
  monthly: {
    unit: "month",
    buckets: 12,
    windowDescription: "Last 12 months",
    truncate: (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
    label: (d) =>
      d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
  },
  yearly: {
    unit: "year",
    buckets: 5,
    windowDescription: "Last 5 years",
    truncate: (d) => new Date(Date.UTC(d.getUTCFullYear(), 0, 1)),
    label: (d) => String(d.getUTCFullYear()),
  },
};

function buildBucketStarts(cfg: PeriodConfig, now: Date): Date[] {
  const base = cfg.truncate(now);
  const starts: Date[] = [];
  for (let i = cfg.buckets - 1; i >= 0; i--) {
    const copy = new Date(base);
    if (cfg.unit === "day") copy.setUTCDate(copy.getUTCDate() - i);
    else if (cfg.unit === "week") copy.setUTCDate(copy.getUTCDate() - i * 7);
    else if (cfg.unit === "month") copy.setUTCMonth(copy.getUTCMonth() - i);
    else copy.setUTCFullYear(copy.getUTCFullYear() - i);
    starts.push(copy);
  }
  return starts;
}

export interface TrendPoint {
  label: string;
  revenueMinor: number;
  orders: number;
  enrollments: number;
}

export interface InsightsKpis {
  revenueMinor: number;
  paidOrders: number;
  ordersCreated: number;
  conversionRate: number;
  averageOrderMinor: number;
  newCustomers: number;
  enrollments: number;
  enrollmentPending: number;
  enrollmentIssues: number;
}

export interface OperationsStatus {
  fulfillmentIssues: number;
  pendingPayments: number;
  failedPayments: number;
  pendingBookings: number;
  upcomingBookings: number;
}

export interface ProductMetric {
  productId: string;
  title: string;
  type: string;
  orders: number;
  revenueMinor: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface EnrollmentActivityRow {
  id: string;
  courseTitle: string;
  customerEmail: string;
  orderReference: string;
  status: string;
  fulfilledAt: string | null;
}

export interface InsightSnapshot {
  period: InsightsPeriod;
  windowDescription: string;
  windowStart: string;
  trend: TrendPoint[];
  kpis: InsightsKpis;
  productsByRevenue: ProductMetric[];
  ordersByStatus: StatusCount[];
  operations: OperationsStatus;
  recentEnrollments: EnrollmentActivityRow[];
}

interface RevenueWindowRow {
  _id: null;
  revenueMinor: number;
}

interface RevenueTrendRow {
  _id: Date;
  revenueMinor: number;
  orders: number;
}

interface EnrollmentTrendRow {
  _id: Date;
  enrollments: number;
}

interface ProductAggRow {
  _id: unknown;
  title: string;
  type: string;
  orders: number;
  revenueMinor: number;
}

interface StatusAggRow {
  _id: string;
  count: number;
}

export async function getInsights(
  periodInput?: string,
  opts: { now?: Date } = {}
): Promise<InsightSnapshot> {
  await dbConnect();

  const now = opts.now ?? new Date();
  const period: InsightsPeriod =
    periodInput === "daily" ||
    periodInput === "weekly" ||
    periodInput === "monthly" ||
    periodInput === "yearly"
      ? periodInput
      : "monthly";
  const cfg = PERIODS[period];
  const bucketStarts = buildBucketStarts(cfg, now);
  const windowStart = bucketStarts[0];

  const [
    ordersCreated,
    paidOrders,
    newCustomers,
    enrollments,
    enrollmentPending,
    enrollmentIssues,
    revenueWindowAgg,
    revenueTrendAgg,
    enrollmentTrendAgg,
    productAgg,
    statusAgg,
    fulfillmentIssues,
    pendingPayments,
    failedPayments,
    pendingBookings,
    upcomingBookings,
    recentFulfillments,
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: windowStart } }),
    Order.countDocuments({ status: "PAID", paidAt: { $gte: windowStart } }),
    User.countDocuments({
      role: { $ne: "admin" },
      createdAt: { $gte: windowStart },
    }),
    Fulfillment.countDocuments({
      type: "CLASSROOM_ENROLLMENT",
      status: "FULFILLED",
      fulfilledAt: { $gte: windowStart },
    }),
    Fulfillment.countDocuments({
      type: "CLASSROOM_ENROLLMENT",
      status: { $in: ["PENDING", "RETRY_PENDING"] },
      createdAt: { $gte: windowStart },
    }),
    Fulfillment.countDocuments({
      type: "CLASSROOM_ENROLLMENT",
      status: { $in: ["ACTION_REQUIRED", "FAILED"] },
      createdAt: { $gte: windowStart },
    }),
    Order.aggregate<RevenueWindowRow>([
      {
        $match: {
          status: "PAID",
          currency: CURRENCY,
          paidAt: { $gte: windowStart },
        },
      },
      { $group: { _id: null, revenueMinor: { $sum: "$totalMinor" } } },
    ]),
    Order.aggregate<RevenueTrendRow>([
      {
        $match: {
          status: "PAID",
          currency: CURRENCY,
          paidAt: { $gte: windowStart },
        },
      },
      {
        $group: {
          _id: { $dateTrunc: { date: "$paidAt", unit: cfg.unit } },
          revenueMinor: { $sum: "$totalMinor" },
          orders: { $sum: 1 },
        },
      },
    ]),
    Fulfillment.aggregate<EnrollmentTrendRow>([
      {
        $match: {
          type: "CLASSROOM_ENROLLMENT",
          status: "FULFILLED",
          fulfilledAt: { $gte: windowStart },
        },
      },
      {
        $group: {
          _id: { $dateTrunc: { date: "$fulfilledAt", unit: cfg.unit } },
          enrollments: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate<ProductAggRow>([
      { $match: { status: "PAID", currency: CURRENCY } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          title: { $first: "$items.titleSnapshot" },
          type: { $first: "$items.typeSnapshot" },
          orders: { $sum: 1 },
          revenueMinor: {
            $sum: { $multiply: ["$items.unitPriceMinor", "$items.quantity"] },
          },
        },
      },
      { $sort: { revenueMinor: -1 } },
      { $limit: 6 },
    ]),
    Order.aggregate<StatusAggRow>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Fulfillment.countDocuments({
      status: { $in: ["ACTION_REQUIRED", "FAILED"] },
    }),
    Payment.countDocuments({
      status: { $in: ["PENDING", "CREATED", "INITIALIZATION_FAILED"] },
    }),
    Payment.countDocuments({
      status: { $in: ["FAILED", "ABANDONED", "SUSPICIOUS"] },
    }),
    Booking.countDocuments({ status: "PENDING" }),
    Booking.countDocuments({
      status: { $in: ["CONFIRMED", "PENDING"] },
      scheduledStartTime: { $gte: now },
    }),
    Fulfillment.find({ type: "CLASSROOM_ENROLLMENT" })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("_id orderId status fulfilledAt")
      .lean()
      .exec(),
  ]);

  const revenueByBucket = new Map<number, RevenueTrendRow>();
  for (const row of revenueTrendAgg) {
    revenueByBucket.set(new Date(row._id).getTime(), row);
  }

  const enrollmentsByBucket = new Map<number, number>();
  for (const row of enrollmentTrendAgg) {
    enrollmentsByBucket.set(new Date(row._id).getTime(), row.enrollments);
  }

  const trend: TrendPoint[] = bucketStarts.map((start) => {
    const revenue = revenueByBucket.get(start.getTime());
    return {
      label: cfg.label(start),
      revenueMinor: revenue?.revenueMinor ?? 0,
      orders: revenue?.orders ?? 0,
      enrollments: enrollmentsByBucket.get(start.getTime()) ?? 0,
    };
  });

  const revenueMinor =
    revenueWindowAgg.length > 0
      ? Number(revenueWindowAgg[0].revenueMinor ?? 0)
      : 0;

  let orders: OrderDocLite[] = [];
  if (recentFulfillments.length > 0) {
    orders = await Order.find({
      _id: { $in: recentFulfillments.map((f) => f.orderId) },
    })
      .select("_id orderReference customerEmail items")
      .lean()
      .exec();
  }
  const orderById = new Map<string, (typeof orders)[number]>();
  for (const o of orders) orderById.set(String(o._id), o);

  const orderedStatuses = [...statusAgg].sort((a, b) => b.count - a.count);

  const productsByRevenue: ProductMetric[] = productAgg.map((row) => ({
    productId: String(row._id ?? ""),
    title: row.title || "Unknown product",
    type: row.type,
    orders: row.orders,
    revenueMinor: row.revenueMinor,
  }));

  const recentEnrollments: EnrollmentActivityRow[] = recentFulfillments.map(
    (f) => {
      const order = orderById.get(String(f.orderId));
      return {
        id: String(f._id),
        courseTitle: order?.items[0]?.titleSnapshot ?? "Course",
        customerEmail: order?.customerEmail ?? "—",
        orderReference: order?.orderReference ?? "—",
        status: f.status,
        fulfilledAt: f.fulfilledAt ? f.fulfilledAt.toISOString() : null,
      };
    }
  );

  return {
    period,
    windowDescription: cfg.windowDescription,
    windowStart: windowStart.toISOString(),
    trend,
    kpis: {
      revenueMinor,
      paidOrders,
      ordersCreated,
      conversionRate:
        ordersCreated > 0 ? Math.round((paidOrders / ordersCreated) * 100) : 0,
      averageOrderMinor:
        paidOrders > 0 ? Math.round(revenueMinor / paidOrders) : 0,
      newCustomers,
      enrollments,
      enrollmentPending,
      enrollmentIssues,
    },
    productsByRevenue,
    ordersByStatus: orderedStatuses.map((row) => ({
      status: row._id,
      count: row.count,
    })),
    operations: {
      fulfillmentIssues,
      pendingPayments,
      failedPayments,
      pendingBookings,
      upcomingBookings,
    },
    recentEnrollments,
  };
}

interface OrderDocLite {
  _id: unknown;
  orderReference: string;
  customerEmail: string;
  items: { titleSnapshot: string }[];
}