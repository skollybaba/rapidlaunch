import type { ReactNode } from "react";

import { WindowTabs } from "@/components/admin/metrics/window-tabs";

interface MetricsHeaderProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  windowKey?: string;
  children?: ReactNode;
}

export function MetricsHeader({
  title,
  subtitle,
  eyebrow = "Analytics",
  windowKey,
  children,
}: MetricsHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-[32px] leading-[1.286] md:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {windowKey ? <WindowTabs windowKey={windowKey} /> : null}
      </div>
    </header>
  );
}
