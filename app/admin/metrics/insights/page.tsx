import "server-only";

import type { Metadata } from "next";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";

import { requireAdmin } from "@/lib/auth/admin";
import { getFocusInsights } from "@/lib/services/metrics-service";
import { EmptyState } from "@/components/ui/empty-state";
import { InsightCard } from "@/components/admin/metrics/insight-card";
import { MetricsHeader } from "@/components/admin/metrics/metrics-header";
import { StatCard } from "@/components/admin/metrics/stat-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Insights & focus | Rapid Launch",
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const windowKey = params.window ?? "30d";
  const insights = await getFocusInsights(windowKey);

  const high = insights.filter((i) => i.severity === "high").length;
  const medium = insights.filter((i) => i.severity === "medium").length;
  const opportunities = insights.filter(
    (i) => i.severity === "opportunity"
  ).length;

  return (
    <div className="admin-enter flex flex-1 flex-col">
      <MetricsHeader
        title="Insights & focus"
        subtitle="Rule-based observations on where to spend your attention next."
        windowKey={windowKey}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="High priority"
          value={high.toLocaleString()}
          icon={AlertTriangle}
          hint="Need attention now"
          tone="danger"
        />
        <StatCard
          label="Medium priority"
          value={medium.toLocaleString()}
          icon={Lightbulb}
          hint="Worth improving"
          tone="warning"
        />
        <StatCard
          label="Opportunities"
          value={opportunities.toLocaleString()}
          icon={Sparkles}
          hint="Room to grow"
          tone="success"
        />
      </div>

      <div className="mt-6 space-y-4">
        {insights.length === 0 ? (
          <EmptyState
            title="No insights for this window"
            description="Once there is enough activity, focus recommendations will appear here. Try a wider window."
          />
        ) : (
          insights.map((insight, index) => (
            <InsightCard key={`${insight.title}-${index}`} insight={insight} />
          ))
        )}
      </div>
    </div>
  );
}
