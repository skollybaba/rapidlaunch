import "server-only";

import { Booking } from "@/models/Booking";
import { Enrollment } from "@/models/Enrollment";
import { Fulfillment } from "@/models/Fulfillment";
import { Lead } from "@/models/Lead";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { AnalyticsEvent } from "@/models/AnalyticsEvent";
import { dbConnect } from "@/lib/db";

/**
 * Server-computed metrics for the admin "Metrics & Analytics" area.
 *
 * Everything is derived from the collections the business already writes to
 * (orders, payments, enrollments, bookings, leads) so historical numbers are
 * available immediately. Funnel "page view" counts come from AnalyticsEvent and
 * start accumulating from deployment; the remaining funnel steps are
 * reconstructed from orders and payments, which are complete.
 */

const CURRENCY = "NGN";

export const METRIC_WINDOWS = ["7d", "30d", "90d", "12m"] as const;

export type MetricWindowKey = (typeof METRIC_WINDOWS)[number];

export type BucketUnit = "day" | "week" | "month";

export interface ResolvedWindow {
  key: MetricWindowKey;
  start: Date;
  end: Date;
  previousStart: Date;
  label: string;
  previousLabel: string;
  bucketUnit: BucketUnit;
}

interface WindowConfig {
  days: number;
  bucketUnit: BucketUnit;
  label: string;
}

const WINDOW_CONFIGS: Record<MetricWindowKey, WindowConfig> = {
  "7d": { days: 7, bucketUnit: "day", label: "Last 7 days" },
  "30d": { days: 30, bucketUnit: "day", label: "Last 30 days" },
  "90d": { days: 90, bucketUnit: "week", label: "Last 90 days" },
  "12m": { days: 365, bucketUnit: "month", label: "Last 12 months" },
};

export function resolveWindow(
  keyInput?: string,
  now: Date = new Date()
): ResolvedWindow {
  const key: MetricWindowKey =
    (METRIC_WINDOWS as readonly string[]).includes(keyInput ?? "")
      ? (keyInput as MetricWindowKey)
      : "30d";
  const cfg = WINDOW_CONFIGS[key];
  const end = new Date(now);
  const start = new Date(
    Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate()
    ) -
      (cfg.days - 1) * 86_400_000
  );
  const previousStart = new Date(start.getTime() - cfg.days * 86_400_000);
  return {
    key,
    start,
    end,
    previousStart,
    label: cfg.label,
    previousLabel: `Previous ${cfg.days}d`,
    bucketUnit: cfg.bucketUnit,
  };
}

function truncateTo(d: Date, unit: BucketUnit): Date {
  const copy = new Date(d);
  if (unit === "day") {
    return new Date(
      Date.UTC(copy.getUTCFullYear(), copy.getUTCMonth(), copy.getUTCDate())
    );
  }
  if (unit === "week") {
    const day = new Date(
      Date.UTC(copy.getUTCFullYear(), copy.getUTCMonth(), copy.getUTCDate())
    );
    const delta = (day.getUTCDay() + 6) % 7;
    day.setUTCDate(day.getUTCDate() - delta);
    return day;
  }
  return new Date(Date.UTC(copy.getUTCFullYear(), copy.getUTCMonth(), 1));
}

function bucketLabel(d: Date, unit: BucketUnit): string {
  if (unit === "day") {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    });
  }
  if (unit === "week") {
    return `w/c ${d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    })}`;
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

export interface KpiMetric {
  current: number;
  previous: number;
  /** Percentage change vs the previous equal window; null when previous is 0. */
  deltaPct: number | null;
}

function kpi(current: number, previous: number): KpiMetric {
  if (previous === 0) return { current, previous, deltaPct: null };
  return {
    current,
    previous,
    deltaPct: Math.round(((current - previous) / previous) * 1000) / 10,
  };
}

export interface ProductRevenueRow {
  productId: string;
  title: string;
  type: string;
  orders: number;
  discountedOrders: number;
  grossMinor: number;
  discountMinor: number;
  netMinor: number;
  sharePct: number;
}

export interface TypeRevenueRow {
  type: string;
  title: string;
  orders: number;
  netMinor: number;
  sharePct: number;
}

export interface CouponUsageRow {
  code: string;
  orders: number;
  discountMinor: number;
}

export interface RevenueTrendPoint {
  label: string;
  grossMinor: number;
  discountMinor: number;
  netMinor: number;
  orders: number;
}

export interface RevenueMetrics {
  window: ResolvedWindow;
  gross: KpiMetric;
  discounts: KpiMetric;
  net: KpiMetric;
  paidOrders: KpiMetric;
  discountedOrders: KpiMetric;
  uniqueCustomers: KpiMetric;
  averageOrder: KpiMetric;
  revenueByType: TypeRevenueRow[];
  productsByRevenue: ProductRevenueRow[];
  couponSummary: CouponUsageRow[];
  purchasedEnrollments: number;
  bonusEnrollments: number;
  trend: RevenueTrendPoint[];
}

interface PaidOrderLite {
  _id: unknown;
  orderReference: string;
  customerEmail: string;
  paidAt: Date | null;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  items: {
    productId: unknown;
    titleSnapshot: string;
    typeSnapshot: string;
    unitPriceMinor: number;
    quantity: number;
  }[];
  metadata: Record<string, unknown>;
}

function currentWindowPaidRows(
  rows: PaidOrderLite[],
  window: ResolvedWindow
): PaidOrderLite[] {
  return rows.filter(
    (row) =>
      row.paidAt !== null && row.paidAt >= window.start && row.paidAt < window.end
  );
}

function previousWindowPaidRows(
  rows: PaidOrderLite[],
  window: ResolvedWindow
): PaidOrderLite[] {
  return rows.filter(
    (row) =>
      row.paidAt !== null &&
      row.paidAt >= window.previousStart &&
      row.paidAt < window.start
  );
}

export const TYPE_TITLES: Record<string, string> = {
  COURSE: "Online courses",
  BOOK: "Digital books",
  CONSULTATION: "Sessions",
  MVP_SERVICE: "MVP services",
};

export async function getRevenueMetrics(
  windowKey?: string,
  opts: { now?: Date } = {}
): Promise<RevenueMetrics> {
  await dbConnect();

  const window = resolveWindow(windowKey, opts.now);
  const rows = (await Order.find({
    status: "PAID",
    currency: CURRENCY,
    paidAt: {
      $gte: window.previousStart,
      $lt: window.end,
    },
  } as unknown as Parameters<typeof Order.find>[0])
    .select(
      "_id orderReference customerEmail paidAt subtotalMinor discountMinor totalMinor items metadata"
    )
    .sort({ paidAt: 1 })
    .lean()
    .exec()) as PaidOrderLite[];

  const current = currentWindowPaidRows(rows, window);
  const previous = previousWindowPaidRows(rows, window);

  const sum = (list: PaidOrderLite[], pick: (r: PaidOrderLite) => number) =>
    list.reduce((acc, r) => acc + pick(r), 0);

  const gross = sum(current, (r) => r.subtotalMinor);
  const discounts = sum(current, (r) => r.discountMinor);
  const net = sum(current, (r) => r.totalMinor);
  const prevGross = sum(previous, (r) => r.subtotalMinor);
  const prevDiscounts = sum(previous, (r) => r.discountMinor);
  const prevNet = sum(previous, (r) => r.totalMinor);

  const byProduct = new Map<string, ProductRevenueRow>();
  for (const row of current) {
    const item = row.items[0];
    if (!item) continue;
    const id = String(item.productId);
    const entry = byProduct.get(id) ?? {
      productId: id,
      title: item.titleSnapshot || "Unknown product",
      type: item.typeSnapshot,
      orders: 0,
      discountedOrders: 0,
      grossMinor: 0,
      discountMinor: 0,
      netMinor: 0,
      sharePct: 0,
    };
    entry.orders += 1;
    entry.grossMinor += row.subtotalMinor;
    entry.discountMinor += row.discountMinor;
    entry.netMinor += row.totalMinor;
    if (row.discountMinor > 0) entry.discountedOrders += 1;
    byProduct.set(id, entry);
  }
  const productsByRevenue = [...byProduct.values()].sort(
    (a, b) => b.netMinor - a.netMinor
  );
  for (const row of productsByRevenue) {
    row.sharePct = net > 0 ? Math.round((row.netMinor / net) * 1000) / 10 : 0;
  }

  const byType = new Map<string, TypeRevenueRow>();
  for (const product of productsByRevenue) {
    const entry = byType.get(product.type) ?? {
      type: product.type,
      title: TYPE_TITLES[product.type] ?? product.type,
      orders: 0,
      netMinor: 0,
      sharePct: 0,
    };
    entry.orders += product.orders;
    entry.netMinor += product.netMinor;
    byType.set(product.type, entry);
  }
  const revenueByType = [...byType.values()].sort(
    (a, b) => b.netMinor - a.netMinor
  );
  for (const row of revenueByType) {
    row.sharePct = net > 0 ? Math.round((row.netMinor / net) * 1000) / 10 : 0;
  }

  const couponMap = new Map<string, CouponUsageRow>();
  for (const row of current) {
    const code = row.metadata?.coupon
      ? String((row.metadata.coupon as { code?: string }).code ?? "CODE")
      : null;
    if (!code) continue;
    const entry = couponMap.get(code) ?? { code, orders: 0, discountMinor: 0 };
    entry.orders += 1;
    entry.discountMinor += row.discountMinor;
    couponMap.set(code, entry);
  }
  const couponSummary = [...couponMap.values()].sort(
    (a, b) => b.discountMinor - a.discountMinor
  );

  const [purchasedEnrollments, bonusEnrollments] = await Promise.all([
    Enrollment.countDocuments({
      status: { $in: ["ACTIVE", "REVOKED"] },
      isBonus: false,
      enrolledAt: { $gte: window.previousStart, $lt: window.end },
    }),
    Enrollment.countDocuments({
      status: { $in: ["ACTIVE", "REVOKED"] },
      isBonus: true,
      enrolledAt: { $gte: window.previousStart, $lt: window.end },
    }),
  ]);

  return {
    window,
    gross: kpi(gross, prevGross),
    discounts: kpi(discounts, prevDiscounts),
    net: kpi(net, prevNet),
    paidOrders: kpi(current.length, previous.length),
    discountedOrders: kpi(
      current.filter((r) => r.discountMinor > 0).length,
      previous.filter((r) => r.discountMinor > 0).length
    ),
    uniqueCustomers: kpi(
      new Set(current.map((r) => r.customerEmail)).size,
      new Set(previous.map((r) => r.customerEmail)).size
    ),
    averageOrder: kpi(
      current.length > 0 ? Math.round(net / current.length) : 0,
      previous.length > 0 ? Math.round(prevNet / previous.length) : 0
    ),
    revenueByType,
    productsByRevenue,
    couponSummary,
    purchasedEnrollments,
    bonusEnrollments,
    trend: buildRevenueTrend(current, window.bucketUnit),
  };
}

function buildRevenueTrend(
  rows: PaidOrderLite[],
  unit: BucketUnit
): RevenueTrendPoint[] {
  const byTime = new Map<
    number,
    { time: number; label: string; grossMinor: number; discountMinor: number; netMinor: number; orders: number }
  >();
  for (const row of rows) {
    if (row.paidAt === null || row.paidAt === undefined) continue;
    const truncated = truncateTo(row.paidAt, unit);
    const time = truncated.getTime();
    const entry = byTime.get(time) ?? {
      time,
      label: bucketLabel(truncated, unit),
      grossMinor: 0,
      discountMinor: 0,
      netMinor: 0,
      orders: 0,
    };
    entry.grossMinor += row.subtotalMinor;
    entry.discountMinor += row.discountMinor;
    entry.netMinor += row.totalMinor;
    entry.orders += 1;
    byTime.set(time, entry);
  }
  return [...byTime.values()]
    .sort((a, b) => a.time - b.time)
    .map((point) => {
      const { time, ...rest } = point;
      void time;
      return rest;
    });
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
}

export interface FunnelLoss {
  from: string;
  to: string;
  count: number;
  pct: number;
}

export interface PaymentOutcomeRow {
  status: string;
  count: number;
}

export interface FunnelMetrics {
  window: ResolvedWindow;
  steps: FunnelStep[];
  losses: FunnelLoss[];
  successRatePct: number;
  viewToPaidPct: number | null;
  paymentOutcomes: PaymentOutcomeRow[];
  checkoutViews: number;
  ordersCreated: number;
  paymentsStarted: number;
  paidOrders: number;
}

export async function getFunnelMetrics(
  windowKey?: string,
  opts: { now?: Date } = {}
): Promise<FunnelMetrics> {
  await dbConnect();

  const window = resolveWindow(windowKey, opts.now);
  const inWindow = { $gte: window.start, $lt: window.end };

  const [checkoutViews, ordersCreated, paymentsStarted, paidOrders, paymentAgg] =
    await Promise.all([
      AnalyticsEvent.countDocuments({ ...inWindow, eventType: "CHECKOUT_VIEWED" }),
      Order.countDocuments({ createdAt: inWindow }),
      Payment.countDocuments({ createdAt: inWindow }),
      Order.countDocuments({ status: "PAID", paidAt: inWindow }),
      Payment.aggregate<PaymentOutcomeRow>([{ $match: { createdAt: inWindow } }, {
        $group: { _id: "$status", count: { $sum: 1 } },
      }]),
    ]);

  const steps: FunnelStep[] = [
    { key: "checked_out", label: "Reached the order page", count: checkoutViews },
    { key: "order_created", label: "Started checkout", count: ordersCreated },
    { key: "payment_started", label: "Moved to payment", count: paymentsStarted },
    { key: "paid", label: "Paid successfully", count: paidOrders },
  ];

  const losses: FunnelLoss[] = [];
  for (let i = 1; i < steps.length; i++) {
    const from = steps[i - 1];
    const to = steps[i];
    if (from.count === 0 || from.count <= to.count) continue;
    losses.push({
      from: from.label,
      to: to.label,
      count: from.count - to.count,
      pct: Math.round(((from.count - to.count) / from.count) * 1000) / 10,
    });
  }

  const orderedStatuses = [
    "CREATED",
    "PENDING",
    "PAID",
    "ABANDONED",
    "FAILED",
    "SUSPICIOUS",
  ] as const;
  const byStatus = new Map(paymentAgg.map((r) => [r.status, r.count]));
  const paymentOutcomes = orderedStatuses.map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
  }));

  return {
    window,
    steps,
    losses,
    successRatePct:
      ordersCreated > 0 ? Math.round((paidOrders / ordersCreated) * 1000) / 10 : 0,
    viewToPaidPct:
      checkoutViews > 0
        ? Math.round((paidOrders / checkoutViews) * 1000) / 10
        : null,
    paymentOutcomes,
    checkoutViews,
    ordersCreated,
    paymentsStarted,
    paidOrders,
  };
}

export interface EnrollmentTrendPoint {
  label: string;
  purchased: number;
  bonus: number;
}

export interface UsageMetrics {
  window: ResolvedWindow;
  activeEnrollments: number;
  enrolledInWindow: number;
  activeLearners: number;
  uniqueLearners: number;
  startedCourses: number;
  completedLessonsTotal: number;
  avgLessonsPerLearner: number;
  purchasedEnrollmentsInWindow: number;
  bonusEnrollmentsInWindow: number;
  enrollmentsTrend: EnrollmentTrendPoint[];
  bookingsConfirmed: number;
  bookingsPending: number;
  bookingsCancelled: number;
  leadsInWindow: number;
  leadsTotal: number;
}

export async function getUsageMetrics(
  windowKey?: string,
  opts: { now?: Date } = {}
): Promise<UsageMetrics> {
  await dbConnect();

  const window = resolveWindow(windowKey, opts.now);
  const inWindow = { $gte: window.start, $lt: window.end };

  const [
    activeEnrollments,
    enrolledInWindow,
    activeLearnerAgg,
    uniqueLearnerAgg,
    startedCourses,
    lessonsAgg,
    enrollTrendAgg,
    bookingsConfirmed,
    bookingsPending,
    bookingsCancelled,
    leadsInWindow,
    leadsTotal,
  ] = await Promise.all([
    Enrollment.countDocuments({ status: "ACTIVE" }),
    Enrollment.countDocuments({ status: "ACTIVE", enrolledAt: inWindow }),
    Enrollment.aggregate<{ _id: string }>([
      { $match: { status: "ACTIVE", lastAccessedAt: inWindow } },
      { $group: { _id: "$userId" } },
    ]),
    Enrollment.aggregate<{ _id: string }>([
      { $match: { status: "ACTIVE" } },
      { $group: { _id: "$userId" } },
    ]),
    Enrollment.countDocuments({
      status: "ACTIVE",
      "completedLessonIds.0": { $exists: true },
    }),
    Enrollment.aggregate<{ total: number }>([
      { $match: { status: "ACTIVE" } },
      {
        $group: { _id: null, total: { $sum: { $size: "$completedLessonIds" } } },
      },
    ]),
    Enrollment.aggregate<{ _id: Date; purchased: number; bonus: number }>([
      { $match: { status: "ACTIVE", enrolledAt: { $gte: window.previousStart, $lt: window.end } } },
      {
        $group: {
          _id: { $dateTrunc: { date: "$enrolledAt", unit: window.bucketUnit } },
          purchased: { $sum: { $cond: [{ $eq: ["$isBonus", false] }, 1, 0] } },
          bonus: { $sum: { $cond: ["$isBonus", 1, 0] } },
        },
      },
    ]),
    Booking.countDocuments({ status: "CONFIRMED", createdAt: inWindow }),
    Booking.countDocuments({ status: "PENDING" }),
    Booking.countDocuments({ status: "CANCELLED", createdAt: inWindow }),
    Lead.countDocuments({ createdAt: inWindow }),
    Lead.countDocuments({}),
  ]);

  const enrollmentsTrend = buildEnrollmentTrend(enrollTrendAgg, window);

  const activeLearners = activeLearnerAgg.length;
  const uniqueLearners = uniqueLearnerAgg.length;
  const completedLessonsTotal = lessonsAgg[0]?.total ?? 0;

  return {
    window,
    activeEnrollments,
    enrolledInWindow,
    activeLearners,
    uniqueLearners,
    startedCourses,
    completedLessonsTotal,
    avgLessonsPerLearner:
      activeLearners > 0
        ? Math.round((completedLessonsTotal / activeLearners) * 10) / 10
        : 0,
    purchasedEnrollmentsInWindow: enrollmentsTrend.reduce(
      (sum, p) => sum + p.purchased,
      0
    ),
    bonusEnrollmentsInWindow: enrollmentsTrend.reduce((sum, p) => sum + p.bonus, 0),
    enrollmentsTrend,
    bookingsConfirmed,
    bookingsPending,
    bookingsCancelled,
    leadsInWindow,
    leadsTotal,
  };
}

function buildEnrollmentTrend(
  sparse: { _id: Date; purchased: number; bonus: number }[],
  window: ResolvedWindow
): EnrollmentTrendPoint[] {
  const byBucket = new Map(
    sparse.map((row) => [truncateTo(row._id, window.bucketUnit).getTime(), row])
  );
  const bucketCount =
    window.bucketUnit === "day"
      ? Math.floor((window.end.getTime() - window.start.getTime()) / 86_400_000)
      : window.bucketUnit === "week"
        ? Math.max(1, Math.ceil((window.end.getTime() - window.start.getTime()) / 604_800_000))
        : 12;
  const out: EnrollmentTrendPoint[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const copy = new Date(window.start);
    if (window.bucketUnit === "day") copy.setUTCDate(copy.getUTCDate() + i);
    else if (window.bucketUnit === "week")
      copy.setUTCDate(copy.getUTCDate() + i * 7);
    else copy.setUTCMonth(copy.getUTCMonth() + i);
    const key = truncateTo(copy, window.bucketUnit).getTime();
    const found = byBucket.get(key);
    out.push({
      label: bucketLabel(copy, window.bucketUnit),
      purchased: found?.purchased ?? 0,
      bonus: found?.bonus ?? 0,
    });
  }
  return out;
}

export interface CustomerValueRow {
  email: string;
  orders: number;
  revenueMinor: number;
  firstPurchase: string;
  lastPurchase: string;
  isRepeatCustomer: boolean;
}

export interface CustomerMetrics {
  totalCustomers: number;
  repeatCustomers: number;
  repeatRatePct: number;
  activeThisWindow: number;
  newThisWindow: number;
  returningThisWindow: number;
  churnedPriorCustomers: number;
  churnRatePct: number;
  totalRevenueMinor: number;
  averageLtvMinor: number;
  customers: CustomerValueRow[];
}

export async function getCustomerMetrics(
  windowKey?: string,
  opts: { now?: Date } = {}
): Promise<CustomerMetrics> {
  await dbConnect();

  const window = resolveWindow(windowKey, opts.now);
  const end = window.end;

  const perCustomerAgg = await Order.aggregate<{
    _id: string;
    revenueMinor: number;
    orders: number;
    firstPurchase: Date;
    lastPurchase: Date;
  }>([
    { $match: { status: "PAID", currency: CURRENCY, paidAt: { $lt: end } } },
    {
      $group: {
        _id: "$customerEmail",
        revenueMinor: { $sum: "$totalMinor" },
        orders: { $sum: 1 },
        firstPurchase: { $min: "$paidAt" },
        lastPurchase: { $max: "$paidAt" },
      },
    },
    { $sort: { revenueMinor: -1 } },
  ]);

  const totalCustomers = perCustomerAgg.length;
  const repeatCustomers = perCustomerAgg.filter((r) => r.orders >= 2).length;
  const totalRevenueMinor = perCustomerAgg.reduce(
    (sum, r) => sum + r.revenueMinor,
    0
  );
  const averageLtvMinor =
    totalCustomers > 0 ? Math.round(totalRevenueMinor / totalCustomers) : 0;

  let activeThisWindow = 0;
  let newThisWindow = 0;
  let returningThisWindow = 0;
  let priorCustomers = 0;
  let churnedPriorCustomers = 0;
  for (const row of perCustomerAgg) {
    const last = new Date(row.lastPurchase);
    const first = new Date(row.firstPurchase);
    if (last >= window.start && last < end) {
      activeThisWindow += 1;
      if (first >= window.start) newThisWindow += 1;
      else returningThisWindow += 1;
    }
    if (first < window.start) {
      priorCustomers += 1;
      if (last < window.start) churnedPriorCustomers += 1;
    }
  }

  const customers: CustomerValueRow[] = perCustomerAgg
    .slice(0, 50)
    .map((row) => ({
      email: row._id,
      orders: row.orders,
      revenueMinor: row.revenueMinor,
      firstPurchase: new Date(row.firstPurchase).toISOString(),
      lastPurchase: new Date(row.lastPurchase).toISOString(),
      isRepeatCustomer: row.orders >= 2,
    }));

  return {
    totalCustomers,
    repeatCustomers,
    repeatRatePct:
      totalCustomers > 0
        ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10
        : 0,
    activeThisWindow,
    newThisWindow,
    returningThisWindow,
    churnedPriorCustomers,
    churnRatePct:
      priorCustomers > 0
        ? Math.round((churnedPriorCustomers / priorCustomers) * 1000) / 10
        : 0,
    totalRevenueMinor,
    averageLtvMinor,
    customers,
  };
}

export interface CustomerOrderRow {
  id: string;
  orderReference: string;
  status: string;
  itemTitle: string;
  itemType: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: string;
  couponCode: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CustomerDetail {
  email: string;
  totalSpentMinor: number;
  paidOrders: number;
  allOrders: number;
  firstPaidAt: string | null;
  lastPaidAt: string | null;
  discountedOrders: number;
  orders: CustomerOrderRow[];
}

export async function getCustomerDetail(
  emailRaw: string
): Promise<CustomerDetail> {
  await dbConnect();

  const email = emailRaw.toLowerCase().trim();
  const orders = await Order.find({
    customerEmail: email,
  } as unknown as Parameters<typeof Order.find>[0])
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const rows: CustomerOrderRow[] = orders.map((order) => ({
    id: String(order._id),
    orderReference: order.orderReference,
    status: order.status,
    itemTitle: order.items[0]?.titleSnapshot ?? "—",
    itemType: order.items[0]?.typeSnapshot ?? "",
    subtotalMinor: order.subtotalMinor,
    discountMinor: order.discountMinor,
    totalMinor: order.totalMinor,
    currency: order.currency,
    couponCode: order.metadata?.coupon
      ? String((order.metadata.coupon as { code?: string }).code ?? "")
      : null,
    paidAt: order.paidAt ? new Date(order.paidAt).toISOString() : null,
    createdAt: order.createdAt
      ? new Date(order.createdAt).toISOString()
      : new Date().toISOString(),
  }));

  const paid = rows.filter((r) => r.status === "PAID");

  return {
    email,
    totalSpentMinor: paid.reduce((sum, r) => sum + r.totalMinor, 0),
    paidOrders: paid.length,
    allOrders: rows.length,
    firstPaidAt: paid.length > 0 ? paid[paid.length - 1].paidAt : null,
    lastPaidAt: paid.length > 0 ? paid[0].paidAt : null,
    discountedOrders: paid.filter((r) => r.discountMinor > 0).length,
    orders: rows,
  };
}

export interface FocusInsight {
  severity: "high" | "medium" | "opportunity";
  title: string;
  detail: string;
  action: string;
  metric: string;
}

export async function getFocusInsights(
  windowKey?: string,
  opts: { now?: Date } = {}
): Promise<FocusInsight[]> {
  await dbConnect();

  const [revenue, funnel, customers, usage] = await Promise.all([
    getRevenueMetrics(windowKey, opts),
    getFunnelMetrics(windowKey, opts),
    getCustomerMetrics(windowKey, opts),
    getUsageMetrics(windowKey, opts),
  ]);

  const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

  const insights: FocusInsight[] = [];

  const topProduct = revenue.productsByRevenue[0];
  const secondProduct = revenue.productsByRevenue[1];
  if (topProduct && revenue.net.current > 0 && topProduct.sharePct >= 60) {
    insights.push({
      severity: "medium",
      title: `${topProduct.title} carries ${topProduct.sharePct}% of revenue`,
      detail: `${topProduct.title} made ${fmt(topProduct.netMinor)} of ${fmt(
        revenue.net.current
      )} net revenue this period. Revenue is concentrated in one product.`,
      action: "Promote your next-best product to reduce reliance on a single source.",
      metric: `${topProduct.sharePct}% concentration`,
    });
  } else if (topProduct && secondProduct) {
    insights.push({
      severity: "opportunity",
      title: "Your catalogue is spreading revenue",
      detail: `No single product dominates — the leader is ${topProduct.title} with ${topProduct.sharePct}% of revenue, followed by ${secondProduct.title} at ${secondProduct.sharePct}%.`,
      action: "Keep cross-selling; the mix already protects you from one-product risk.",
      metric: `${topProduct.sharePct}% / ${secondProduct.sharePct}% top two`,
    });
  }

  if (funnel.losses.length > 0) {
    const biggest = funnel.losses[0];
    insights.push({
      severity: "high",
      title: `${biggest.pct}% of buyers drop off between "${biggest.from.toLowerCase()}" and "${biggest.to.toLowerCase()}"`,
      detail: `${biggest.count} people left between those steps in the window.`,
      action: "Review that step — pricing clarity, payment friction and reminder emails are the usual suspects.",
      metric: `${biggest.pct}% step drop-off`,
    });
  } else if (funnel.checkoutViews > 0) {
    insights.push({
      severity: "opportunity",
      title: "No drop-offs between checkout steps",
      detail: "Every step carried through to payment this window — a healthy funnel.",
      action: "Scale the top of the funnel with more traffic, since checkout no longer leaks.",
      metric: "Funnel fully converting",
    });
  }

  if (revenue.paidOrders.current > 0) {
    const discountedShare =
      (revenue.discountedOrders.current / revenue.paidOrders.current) * 100;
    if (discountedShare >= 50) {
      insights.push({
        severity: "medium",
        title: "More than half of orders used a discount",
        detail: `${revenue.discountedOrders.current} of ${revenue.paidOrders.current} paid orders (${Math.round(
          discountedShare
        )}%) used a code, giving up ${fmt(revenue.discounts.current)}.`,
        action: "Review coupon generosity — discounts may be cannibalising full-price buyers.",
        metric: `${Math.round(discountedShare)}% discounted orders`,
      });
    }
  }

  if (customers.repeatRatePct < 20 && customers.totalCustomers >= 5) {
    insights.push({
      severity: "medium",
      title: "Most customers buy once",
      detail: `Only ${customers.repeatRatePct}% of ${customers.totalCustomers} paying customers returned for a second purchase.`,
      action: "Add a post-purchase email sequence and a loyalty offer to turn one-time buyers into repeat customers.",
      metric: `${customers.repeatRatePct}% repeat rate`,
    });
  }

  if (revenue.purchasedEnrollments > 0 && revenue.bonusEnrollments > 0) {
    const bonusShare = Math.round(
      (revenue.bonusEnrollments /
        (revenue.purchasedEnrollments + revenue.bonusEnrollments)) *
        100
    );
    if (bonusShare >= 50) {
      insights.push({
        severity: "opportunity",
        title: "Bonus courses make up a large share of enrollments",
        detail: `${revenue.bonusEnrollments} bonus grants vs ${revenue.purchasedEnrollments} purchased enrollments (${bonusShare}% bonus).`,
        action: "Use bundled bonus courses as your acquisition lever — highlight them on the sales page.",
        metric: `${bonusShare}% bonus enrollment share`,
      });
    }
  }

  if (usage.bookingsPending > 0) {
    insights.push({
      severity: "high",
      title: `${usage.bookingsPending} bookings need your attention`,
      detail: "Pending bookings have not been confirmed with a session time yet.",
      action: "Confirm or follow up on pending bookings so customers don't wait on a paid session.",
      metric: `${usage.bookingsPending} pending`,
    });
  }

  const fulfillmentIssues = await Fulfillment.countDocuments({
    status: { $in: ["ACTION_REQUIRED", "FAILED"] },
  });
  if (fulfillmentIssues > 0) {
    insights.push({
      severity: "high",
      title: `${fulfillmentIssues} fulfillment items need action`,
      detail: "Course enrollments or sessions that failed can strand paying customers.",
      action: "Fix these in Enrollees before they show up as support tickets.",
      metric: `${fulfillmentIssues} issues`,
    });
  }

  if (customers.churnRatePct >= 50 && customers.totalCustomers >= 5) {
    insights.push({
      severity: "medium",
      title: `${customers.churnRatePct}% of past customers did not return`,
      detail: `${customers.churnedPriorCustomers} of ${customers.totalCustomers} previous buyers had no purchase in the window.`,
      action: "Re-engage dormant buyers with a recall campaign.",
      metric: `${customers.churnRatePct}% churn`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      severity: "opportunity",
      title: "All systems look healthy",
      detail: "No concentration, funnel or operational warnings in this window.",
      action: "Use the profit calculator to confirm margins are safe before scaling ad spend.",
      metric: "Healthy baseline",
    });
  }

  return insights;
}

export function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Start date for a `YYYY-MM` month key, in UTC. */
export function monthStart(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

/** First instant of the month after `key`, in UTC (exclusive end bound). */
export function monthEndExclusive(key: string): Date {
  const start = monthStart(key);
  const next = new Date(start);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export interface MonthRevenueSummary {
  month: string;
  grossMinor: number;
  discountMinor: number;
  netMinor: number;
  paidOrders: number;
  uniqueCustomers: number;
}

export async function getMonthRevenueSummary(
  key: string
): Promise<MonthRevenueSummary> {
  await dbConnect();

  const start = monthStart(key);
  const end = monthEndExclusive(key);

  const rows = await Order.find({
    status: "PAID",
    currency: CURRENCY,
    paidAt: { $gte: start, $lt: end },
  } as unknown as Parameters<typeof Order.find>[0])
    .select("customerEmail subtotalMinor discountMinor totalMinor")
    .lean()
    .exec();

  return {
    month: key,
    grossMinor: rows.reduce((sum, r) => sum + r.subtotalMinor, 0),
    discountMinor: rows.reduce((sum, r) => sum + r.discountMinor, 0),
    netMinor: rows.reduce((sum, r) => sum + r.totalMinor, 0),
    paidOrders: rows.length,
    uniqueCustomers: new Set(rows.map((r) => r.customerEmail)).size,
  };
}