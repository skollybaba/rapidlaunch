import "server-only";

import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { dbConnect } from "@/lib/db";
import { countFrom, liveOrderStages } from "@/lib/services/live-order-filter";
import {
  CUSTOM_WINDOW_KEY,
  formatRangeLabel,
  resolveCustomDateRange,
} from "@/lib/metrics/windows";

const CURRENCY = "NGN";

const ENROLLMENT_TYPES = ["LMS_ENROLLMENT", "CLASSROOM_ENROLLMENT"];

export const INSIGHTS_PERIODS = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export type InsightsPeriod = (typeof INSIGHTS_PERIODS)[number];

/** `custom` is selected when the admin picks an explicit start and end date. */
export type InsightsWindow = InsightsPeriod | typeof CUSTOM_WINDOW_KEY;

type BucketUnit = "day" | "week" | "month" | "year";

interface PeriodConfig {
  unit: BucketUnit;
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

function startOfUtcMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfUtcYear(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function shortDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

const TRUNCATES: Record<BucketUnit, (d: Date) => Date> = {
  day: startOfUtcDay,
  week: startOfUtcWeek,
  month: startOfUtcMonth,
  year: startOfUtcYear,
};

const LABELS: Record<BucketUnit, (d: Date) => string> = {
  day: shortDate,
  week: (d) => `w/c ${shortDate(d)}`,
  month: (d) =>
    d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
  year: (d) => String(d.getUTCFullYear()),
};

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
    truncate: startOfUtcMonth,
    label: (d) =>
      d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
  },
  yearly: {
    unit: "year",
    buckets: 5,
    windowDescription: "Last 5 years",
    truncate: startOfUtcYear,
    label: (d) => String(d.getUTCFullYear()),
  },
};

function addUnits(date: Date, unit: BucketUnit, amount: number): Date {
  const copy = new Date(date);
  if (unit === "day") copy.setUTCDate(copy.getUTCDate() + amount);
  else if (unit === "week") copy.setUTCDate(copy.getUTCDate() + amount * 7);
  else if (unit === "month") copy.setUTCMonth(copy.getUTCMonth() + amount);
  else copy.setUTCFullYear(copy.getUTCFullYear() + amount);
  return copy;
}

function buildBucketStarts(cfg: PeriodConfig, now: Date): Date[] {
  const base = cfg.truncate(now);
  const starts: Date[] = [];
  for (let i = cfg.buckets - 1; i >= 0; i--) {
    starts.push(addUnits(base, cfg.unit, -i));
  }
  return starts;
}

/** Buckets that cover `[start, end)` for an arbitrary custom range. */
function buildBucketStartsBetween(
  unit: BucketUnit,
  start: Date,
  end: Date
): Date[] {
  const starts: Date[] = [];
  let cursor = TRUNCATES[unit](start);
  for (let i = 0; i < 5000 && cursor.getTime() < end.getTime(); i++) {
    starts.push(cursor);
    cursor = addUnits(cursor, unit, 1);
  }
  return starts;
}

/** Coarser buckets keep long custom ranges readable. */
function customUnitForDays(days: number): BucketUnit {
  if (days <= 62) return "day";
  if (days <= 400) return "week";
  if (days <= 1100) return "month";
  return "year";
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
  period: InsightsWindow;
  windowDescription: string;
  windowStart: string;
  /** `YYYY-MM-DD` first day; only set for a custom range. */
  rangeStart?: string;
  /** `YYYY-MM-DD` last inclusive day; only set for a custom range. */
  rangeEnd?: string;
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

interface RecentFulfillmentRow {
  _id: unknown;
  orderId: unknown;
  status: string;
  fulfilledAt: Date | null;
}

export interface InsightsWindowInput {
  period?: string;
  window?: string;
  /** `YYYY-MM-DD` start of a custom range (inclusive). */
  start?: string;
  /** `YYYY-MM-DD` end of a custom range (inclusive). */
  end?: string;
}

export async function getInsights(
  input?: string | InsightsWindowInput,
  opts: { now?: Date } = {}
): Promise<InsightSnapshot> {
  await dbConnect();

  const now = opts.now ?? new Date();
  const requested: InsightsWindowInput =
    typeof input === "string" ? { period: input } : (input ?? {});

  const customRange =
    requested.window === CUSTOM_WINDOW_KEY
      ? resolveCustomDateRange(requested.start, requested.end, now)
      : null;

  let period: InsightsWindow;
  let bucketStarts: Date[];
  let bucketUnit: BucketUnit;
  let bucketLabel: (d: Date) => string;
  let windowStart: Date;
  /** Exclusive upper bound; only custom ranges are capped. */
  let windowEnd: Date | null = null;
  let rangeStart: string | undefined;
  let rangeEnd: string | undefined;
  let windowDescription: string;

  if (customRange) {
    const unit = customUnitForDays(customRange.days);
    period = CUSTOM_WINDOW_KEY;
    bucketUnit = unit;
    bucketLabel = LABELS[unit];
    bucketStarts = buildBucketStartsBetween(
      unit,
      customRange.start,
      customRange.end
    );
    windowStart = customRange.start;
    windowEnd = customRange.end;
    rangeStart = customRange.startDate;
    rangeEnd = customRange.endDate;
    windowDescription = formatRangeLabel(customRange);
  } else {
    period =
      requested.period === "daily" ||
      requested.period === "weekly" ||
      requested.period === "monthly" ||
      requested.period === "yearly"
        ? requested.period
        : "monthly";
    const cfg = PERIODS[period];
    bucketUnit = cfg.unit;
    bucketLabel = cfg.label;
    bucketStarts = buildBucketStarts(cfg, now);
    windowStart = bucketStarts[0];
    windowDescription = cfg.windowDescription;
  }

  // Custom ranges end in the past, so every period query needs an upper bound.
  const windowMatch = windowEnd
    ? { $gte: windowStart, $lt: windowEnd }
    : { $gte: windowStart };

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
    Order.countDocuments({ createdAt: windowMatch }),
    Order.countDocuments({ status: "PAID", paidAt: windowMatch }),
    User.countDocuments({
      role: { $ne: "admin" },
      createdAt: windowMatch,
    }),
    Fulfillment.aggregate<{ count: number }>([
      {
        $match: {
          type: { $in: ENROLLMENT_TYPES },
          status: "FULFILLED",
          fulfilledAt: windowMatch,
        },
      },
      ...liveOrderStages(),
      { $count: "count" },
    ]).then(countFrom),
    Fulfillment.aggregate<{ count: number }>([
      {
        $match: {
          type: { $in: ENROLLMENT_TYPES },
          status: { $in: ["PENDING", "RETRY_PENDING"] },
          createdAt: windowMatch,
        },
      },
      ...liveOrderStages(),
      { $count: "count" },
    ]).then(countFrom),
    Fulfillment.aggregate<{ count: number }>([
      {
        $match: {
          type: { $in: ENROLLMENT_TYPES },
          status: { $in: ["ACTION_REQUIRED", "FAILED"] },
          createdAt: windowMatch,
        },
      },
      ...liveOrderStages(),
      { $count: "count" },
    ]).then(countFrom),
    Order.aggregate<RevenueWindowRow>([
      {
        $match: {
          status: "PAID",
          currency: CURRENCY,
          paidAt: windowMatch,
        },
      },
      { $group: { _id: null, revenueMinor: { $sum: "$totalMinor" } } },
    ]),
    Order.aggregate<RevenueTrendRow>([
      {
        $match: {
          status: "PAID",
          currency: CURRENCY,
          paidAt: windowMatch,
        },
      },
      {
        $group: {
          _id: { $dateTrunc: { date: "$paidAt", unit: bucketUnit } },
          revenueMinor: { $sum: "$totalMinor" },
          orders: { $sum: 1 },
        },
      },
    ]),
    Fulfillment.aggregate<EnrollmentTrendRow>([
      {
        $match: {
          type: { $in: ENROLLMENT_TYPES },
          status: "FULFILLED",
          fulfilledAt: windowMatch,
        },
      },
      ...liveOrderStages(),
      {
        $group: {
          _id: { $dateTrunc: { date: "$fulfilledAt", unit: bucketUnit } },
          enrollments: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate<ProductAggRow>([
      { $match: { status: "PAID", currency: CURRENCY, paidAt: windowMatch } },
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
    Fulfillment.aggregate<{ count: number }>([
      { $match: { status: { $in: ["ACTION_REQUIRED", "FAILED"] } } },
      ...liveOrderStages(),
      { $count: "count" },
    ]).then(countFrom),
    Payment.aggregate<{ count: number }>([
      {
        $match: {
          status: { $in: ["PENDING", "CREATED", "INITIALIZATION_FAILED"] },
        },
      },
      ...liveOrderStages(),
      { $count: "count" },
    ]).then(countFrom),
    Payment.aggregate<{ count: number }>([
      { $match: { status: { $in: ["FAILED", "ABANDONED", "SUSPICIOUS"] } } },
      ...liveOrderStages(),
      { $count: "count" },
    ]).then(countFrom),
    Booking.countDocuments({ status: "PENDING" }),
    Booking.countDocuments({
      status: { $in: ["CONFIRMED", "PENDING"] },
      scheduledStartTime: { $gte: now },
    }),
    Fulfillment.aggregate<RecentFulfillmentRow>([
      { $match: { type: { $in: ENROLLMENT_TYPES } } },
      ...liveOrderStages(),
      { $sort: { createdAt: -1 } },
      { $limit: 8 },
      { $project: { _id: 1, orderId: 1, status: 1, fulfilledAt: 1 } },
    ]),
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
      label: bucketLabel(start),
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
    windowDescription,
    windowStart: windowStart.toISOString(),
    rangeStart,
    rangeEnd,
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