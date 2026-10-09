import {
  AlertTriangle,
  Lightbulb,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Severity = "high" | "medium" | "opportunity";

interface InsightCardProps {
  insight: {
    severity: Severity;
    title: string;
    detail: string;
    action: string;
    metric: string;
  };
}

const severityConfig: Record<
  Severity,
  { label: string; tone: BadgeTone; icon: LucideIcon; accent: string; iconClass: string }
> = {
  high: {
    label: "High priority",
    tone: "error",
    icon: AlertTriangle,
    accent: "before:bg-danger-600",
    iconClass: "bg-danger-100 text-danger-600",
  },
  medium: {
    label: "Medium priority",
    tone: "pending",
    icon: Lightbulb,
    accent: "before:bg-warning-600",
    iconClass: "bg-warning-100 text-warning-600",
  },
  opportunity: {
    label: "Opportunity",
    tone: "success",
    icon: Sparkles,
    accent: "before:bg-success-600",
    iconClass: "bg-success-100 text-success-600",
  },
};

export function InsightCard({ insight }: InsightCardProps) {
  const config = severityConfig[insight.severity];
  const Icon = config.icon;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[16px] border border-neutral-300 bg-white p-5 pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1.5",
        config.accent
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              config.iconClass
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-base font-bold text-neutral-950">
            {insight.title}
          </h3>
        </div>
        <Badge tone={config.tone}>{config.label}</Badge>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-neutral-700">
        {insight.detail}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-100 pt-4">
        <p className="text-sm">
          <span className="font-semibold text-neutral-500">Action</span>
          <span className="ml-2 text-neutral-950">{insight.action}</span>
        </p>
        <p className="font-mono text-xs text-neutral-500">
          {insight.metric}
        </p>
      </div>
    </article>
  );
}
