"use client";

import { useEffect, useState } from "react";

function secondsLeft(startTime: string): number {
  return Math.max(0, Math.floor((new Date(startTime).getTime() - Date.now()) / 1000));
}

function format(seconds: number): string {
  if (seconds <= 0) return "Started";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function BookingCountdown({ startTime }: { startTime: string }) {
  const [remaining, setRemaining] = useState(() => secondsLeft(startTime));

  useEffect(() => {
    setRemaining(secondsLeft(startTime));
    const id = setInterval(() => setRemaining(secondsLeft(startTime)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const started = remaining <= 0;

  return (
    <span
      className={`inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${
        started
          ? "bg-neutral-100 text-neutral-500"
          : "bg-terracotta-100 text-terracotta-600"
      }`}
      title={new Date(startTime).toLocaleString()}
    >
      {started ? "Started" : format(remaining)}
    </span>
  );
}
