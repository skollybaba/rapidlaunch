import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import { getFunnelMetrics, METRIC_WINDOWS } from "@/lib/services/metrics-service";
import { FunnelChart } from "@/components/admin/metrics/funnel-chart";

export const dynamic = "force-dynamic";

async function getFunnelData(searchParams: Promise<{ window?: string }>) {
  const params = await searchParams;
  const windowKey = params.window ?? "30d";
  return getFunnelMetrics(windowKey);
}

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center">Access denied</div>;
  }

  const data = await getFunnelData(searchParams);
  const { window, steps, losses, successRatePct, viewToPaidPct, paymentOutcomes } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Checkout funnel</h1>
          <p className="text-neutral-500 mt-1">
            Where buyers drop off from page view to successful payment.
          </p>
        </div>
        <WindowSelector windowKey={window.key} />
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Order page views" value={data.checkoutViews.toLocaleString()} />
        <KpiCard label="Checkout started" value={data.ordersCreated.toLocaleString()} />
        <KpiCard label="Payment started" value={data.paymentsStarted.toLocaleString()} />
        <KpiCard label="Paid" value={data.paidOrders.toLocaleString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <FunnelChart
            title="Checkout funnel"
            steps={steps}
            hint={`${data.checkoutViews > 0 ? viewToPaidPct !== null ? `${viewToPaidPct}%` : "Recording" : "Views start counting from now"} of views reach payment`}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-500">Step drop-offs</h3>
          <ul className="mt-4 space-y-3">
            {losses.length === 0 ? (
              <li className="text-neutral-500 text-center py-4">No drop-offs detected in this window</li>
            ) : (
              losses.map((loss, i) => (
                <li key={i} className="flex items-center justify-between p-3 rounded-[10px] bg-neutral-50">
                  <span className="text-sm text-neutral-600">
                    {loss.from} &rarr; {loss.to}
                  </span>
                  <span className="font-semibold text-red-600">
                    -{loss.count.toLocaleString()} ({loss.pct}%)
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-500">Payment outcomes</h3>
          <ul className="mt-4 space-y-2">
            {paymentOutcomes.map((o) => (
              <li key={o.status} className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 capitalize">{o.status.toLowerCase().replace("_", " ")}</span>
                <span className="font-medium text-neutral-900">{o.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-semibold text-neutral-950">
            Success rate: {successRatePct}%
          </p>
        </div>
      </div>

      {data.checkoutViews === 0 && (
        <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Page views are not yet recorded for this window. Analytics events start counting from deployment.
            Historical funnel steps are reconstructed from orders and payments.
          </p>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function WindowSelector({ windowKey }: { windowKey: string }) {
  return (
    <select
      defaultValue={windowKey}
      onChange={(e) => window.location.search = `?window=${e.target.value}`}
      className="rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-sm font-medium"
    >
      {METRIC_WINDOWS.map((w) => (
        <option key={w} value={w}>
          {w === "7d" ? "Last 7 days" : w === "30d" ? "Last 30 days" : w === "90d" ? "Last 90 days" : "Last 12 months"}
        </option>
      ))}
    </select>
  );
}