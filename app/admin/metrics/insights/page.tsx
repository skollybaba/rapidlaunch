import "server-only";

import { getCurrentUser } from "@/lib/auth/session";
import { getFocusInsights, METRIC_WINDOWS } from "@/lib/services/metrics-service";

export const dynamic = "force-dynamic";

async function getInsightsData(searchParams: Promise<{ window?: string }>) {
  const params = await searchParams;
  const windowKey = params.window ?? "30d";
  return getFocusInsights(windowKey);
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ window?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center">Access denied</div>;
  }

  const insights = await getInsightsData(searchParams);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Insights & focus</h1>
          <p className="text-neutral-500 mt-1">
            Rule-based observations on where to focus your effort.
          </p>
        </div>
        <WindowSelector />
      </header>

      <div className="space-y-4">
        {insights.map((insight, index) => (
          <InsightCard key={index} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: { severity: "high" | "medium" | "opportunity"; title: string; detail: string; action: string; metric: string } }) {
  const severityColors = {
    high: "border-red-300 bg-red-50 text-red-900",
    medium: "border-amber-300 bg-amber-50 text-amber-900",
    opportunity: "border-emerald-300 bg-emerald-50 text-emerald-900",
  }[insight.severity];

  const severityLabels = {
    high: "High priority",
    medium: "Medium priority",
    opportunity: "Opportunity",
  }[insight.severity];

  return (
    <div className={`rounded-[16px] border ${severityColors} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
              {severityLabels}
            </span>
            <h3 className="text-sm font-semibold">{insight.title}</h3>
          </div>
          <p className="mt-2 text-sm text-neutral-700">{insight.detail}</p>
          <p className="mt-3 text-sm font-medium">
            <span className="font-normal">Action:</span> {insight.action}
          </p>
          <p className="mt-2 text-xs text-neutral-500">Metric: {insight.metric}</p>
        </div>
      </div>
    </div>
  );
}

function WindowSelector() {
  return (
    <select
      defaultValue="30d"
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