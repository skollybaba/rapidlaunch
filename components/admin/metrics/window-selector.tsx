"use client";

import { METRIC_WINDOWS, WINDOW_LABELS } from "@/lib/metrics/windows";

export function WindowSelector({ windowKey = "30d" }: { windowKey?: string }) {
  return (
    <select
      defaultValue={windowKey}
      onChange={(event) => {
        window.location.search = `?window=${event.target.value}`;
      }}
      className="rounded-[8px] border border-neutral-300 bg-white px-3 py-2 text-sm font-medium"
    >
      {METRIC_WINDOWS.map((key) => (
        <option key={key} value={key}>
          {WINDOW_LABELS[key]}
        </option>
      ))}
    </select>
  );
}
