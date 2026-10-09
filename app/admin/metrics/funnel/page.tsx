import "server-only";

import type { Metadata } from "next";
import {
  BadgeCheck,
  CreditCard,
  Eye,
  Info,
  ShoppingCart,
  TrendingUp,
  UserMinus,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/admin";
import { getFunnelMetrics } from "@/lib/services/metrics-service";
import { FunnelChart } from "@/components/admin/metrics/funnel-chart";
import { MetricsHeader } from "@/components/admin/metrics/metrics-header";
import { SectionCard } from "@/components/admin/metrics/section-card";
import { StatCard } from "@/components/admin/metrics/stat-card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout funnel | Rapid Launch",
};

const STATUS_TONE: Record<string, string> = {
  PAID: "bg-success-600",
  PENDING: "bg-warning-600",
  CREATED: "bg-neutral-500",
  ABANDONED: "bg-neutral-300",
  FAILED: "bg-danger-600",
  SUSPICIOUS: "bg-ai-violet",
};

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const data = await getFunnelMetrics(params.window ?? "30d");
  const {
    window,
    steps,
    losses,
    successRatePct,
    viewToPaidPct,
    paymentOutcomes,
    checkoutViews,
    ordersCreated,
    paymentsStarted,
    paidOrders,
  } = data;

  const outcomeMax = Math.max(1, ...paymentOutcomes.map((o) => o.count));

  return (
    <div className="admin-enter flex flex-1 flex-col">
      <MetricsHeader
        title="Checkout funnel"
        subtitle="Where buyers drop off between viewing a product and paying."
        windowKey={window.key}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Order page views"
          value={checkoutViews.toLocaleString()}
          icon={Eye}
          hint="Analytics events in window"
          tone="info"
        />
        <StatCard
          label="Checkout started"
          value={ordersCreated.toLocaleString()}
          icon={ShoppingCart}
        />
        <StatCard
          label="Payment started"
          value={paymentsStarted.toLocaleString()}
          icon={CreditCard}
          tone="warning"
        />
        <StatCard
          label="Paid successfully"
          value={paidOrders.toLocaleString()}
          icon={BadgeCheck}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="View → paid"
          value={viewToPaidPct !== null ? `${viewToPaidPct}%` : "—"}
          icon={TrendingUp}
          hint={
            viewToPaidPct !== null
              ? "of product views convert"
              : "views not recorded yet"
          }
        />
        <StatCard
          label="Checkout → paid"
          value={`${successRatePct}%`}
          icon={BadgeCheck}
          hint="of started checkouts succeed"
          tone="success"
        />
        <StatCard
          label="Drop-offs detected"
          value={losses.length.toString()}
          icon={UserMinus}
          hint="steps with lost buyers"
          tone="danger"
        />
      </div>

      <div className="mt-8">
        <FunnelChart
          title="Checkout funnel"
          steps={steps}
          hint={window.label}
        />
      </div>

      {checkoutViews === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-[16px] border border-warning-100 bg-warning-100 p-4">
          <Info
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-warning-600"
          />
          <p className="text-sm text-neutral-700">
            Page-view analytics only start counting from the latest deployment.
            Earlier funnel steps are reconstructed from orders and payments, so
            the first step can read lower than the rest until new traffic
            arrives.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Step drop-offs"
          subtitle="Where buyers leave the funnel"
        >
          {losses.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">
              No drop-offs detected in this window.
            </p>
          ) : (
            <ul className="space-y-3">
              {losses.map((loss, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-3 rounded-[12px] bg-danger-100 px-4 py-3"
                >
                  <span className="min-w-0 truncate text-sm text-neutral-700">
                    {loss.from} <span className="text-neutral-400">→</span>{" "}
                    {loss.to}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-danger-600">
                    −{loss.count.toLocaleString()} ({loss.pct}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Payment outcomes"
          subtitle="Every payment attempt in this window"
        >
          <ul className="space-y-3">
            {paymentOutcomes.map((outcome) => {
              const pct = Math.round((outcome.count / outcomeMax) * 100);
              return (
                <li key={outcome.status}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium capitalize text-neutral-700">
                      {outcome.status.toLowerCase().replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold tabular-nums text-neutral-950">
                      {outcome.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        STATUS_TONE[outcome.status] ?? "bg-terracotta-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
