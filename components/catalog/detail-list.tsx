import type { ReactNode } from "react";

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-sm font-medium text-neutral-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-neutral-950">
        {value}
      </dd>
    </div>
  );
}

export const DetailList = {
  Row: DetailRow,
};