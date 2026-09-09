"use client";

import { useEffect, useState } from "react";

const TITLE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function secondsLeft(startTime: string, now: number): number {
  return Math.max(0, Math.floor((new Date(startTime).getTime() - now) / 1000));
}

export function format(seconds: number): string {
  if (seconds <= 0) return "Started";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function formatCountdownTitle(startTime: string): string {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return startTime;
  return TITLE_FORMATTER.format(date);
}

export function BookingCountdown({ startTime }: { startTime: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = secondsLeft(startTime, now);
  const started = remaining <= 0;

  return (
    <span
      className={`inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${
        started
          ? "bg-neutral-100 text-neutral-500"
          : "bg-terracotta-100 text-terracotta-600"
      }`}
      title={formatCountdownTitle(startTime)}
      suppressHydrationWarning
    >
      {started ? "Started" : format(remaining)}
    </span>
  );
}
