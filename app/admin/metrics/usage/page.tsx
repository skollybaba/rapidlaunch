import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import { getUsageMetrics, METRIC_WINDOWS } from "@/lib/services/metrics-service";
import { TrendChart } from "@/components/admin/trend-chart";

export const dynamic = "force-dynamic";

async function getUsageData(searchParams: Promise<{ window?: string }>) {
  const params = await searchParams;
  const windowKey = params.window ?? "30d";
  return getUsageMetrics(windowKey);
}

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center">Access denied</div>;
  }

  const data = await getUsageData(searchParams);
  const { window, activeEnrollments, enrolledInWindow, activeLearners, uniqueLearners, startedCourses, completedLessonsTotal, avgLessonsPerLearner, purchasedEnrollmentsInWindow, bonusEnrollmentsInWindow, enrollmentsTrend, bookingsConfirmed, bookingsPending, bookingsCancelled, leadsInWindow, leadsTotal } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Usage metrics</h1>
          <p className="text-neutral-500 mt-1">
            Course engagement, bookings and lead volume.
          </p>
        </div>
        <WindowSelector windowKey={window.key} />
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Active enrollments" value={activeEnrollments.toLocaleString()} />
        <KpiCard label="Enrolled this window" value={enrolledInWindow.toLocaleString()} />
        <KpiCard label="Active learners" value={activeLearners.toLocaleString()} />
        <KpiCard label="Started courses" value={startedCourses.toLocaleString()} />
        <KpiCard label="Avg lessons/learner" value={avgLessonsPerLearner.toString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <TrendChart
            title="Enrollments trend"
            bars={enrollmentsTrend.map((p) => ({ label: p.label, value: p.purchased + p.bonus }))}
            formatValue={(v) => v.toLocaleString()}
            color="terracotta"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-500">Enrollment mix this window</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-[12px] bg-terracotta-50">
              <p className="text-sm text-neutral-500">Purchased</p>
              <p className="text-2xl font-bold text-terracotta-900">{purchasedEnrollmentsInWindow.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-[12px] bg-lavender-50">
              <p className="text-sm text-neutral-500">Bonus</p>
              <p className="text-2xl font-bold text-purple-900">{bonusEnrollmentsInWindow.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-500">Bookings</h3>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Confirmed this window</span>
              <span className="font-medium text-neutral-900">{bookingsConfirmed.toLocaleString()}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Pending now</span>
              <span className="font-medium text-amber-600">{bookingsPending.toLocaleString()}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Cancelled this window</span>
              <span className="font-medium text-red-600">{bookingsCancelled.toLocaleString()}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-[16px] border border-neutral-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-500">Leads</h3>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">New this window</span>
              <span className="font-medium text-neutral-900">{leadsInWindow.toLocaleString()}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">All-time total</span>
              <span className="font-medium text-neutral-900">{leadsTotal.toLocaleString()}</span>
            </li>
          </ul>
        </div>
      </div>
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