import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-100 px-6 py-16 text-center",
        className
      )}
    >
      <h2 className="text-[1.375rem] leading-snug">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}