"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export interface SchedulerSlot {
  startTime: string;
  endTime: string;
}

interface SchedulerCalendarProps {
  slots: SchedulerSlot[];
  selectedSlot: string;
  onSelect: (startTime: string) => void;
  disabled?: boolean;
  durationMinutes?: number;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function displayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function timeLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function SchedulerCalendar({
  slots,
  selectedSlot,
  onSelect,
  disabled,
  durationMinutes,
}: SchedulerCalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(today);
    d.setDate(1);
    return d;
  });

  const slotsByDate = useMemo(() => {
    const map = new Map<string, SchedulerSlot[]>();
    for (const slot of slots) {
      const key = displayDate(new Date(slot.startTime));
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    }
    return map;
  }, [slots]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1
    ).getDay();
    const startOffset = (firstWeekday + 6) % 7;
    const start = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1 - startOffset
    );
    const grid: Date[] = [];
    for (let i = 0; i < 42; i++) {
      grid.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return grid;
  }, [viewMonth]);

  const canGoPrevious =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() &&
      viewMonth.getMonth() > today.getMonth());

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(viewMonth);

  const selectedDateKey = selectedSlot
    ? displayDate(new Date(selectedSlot))
    : "";

  const selectedDateSlots = selectedDateKey
    ? slotsByDate.get(selectedDateKey) ?? []
    : [];

  function moveMonth(delta: number) {
    setViewMonth(
      (prev) =>
        new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <p className="text-sm font-semibold text-neutral-950">{monthLabel}</p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous month"
            disabled={disabled || !canGoPrevious}
            onClick={() => moveMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-pill border border-neutral-300 text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:border-terracotta-600 hover:text-terracotta-600 disabled:pointer-events-none disabled:opacity-40"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={disabled}
            onClick={() => moveMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-pill border border-neutral-300 text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:border-terracotta-600 hover:text-terracotta-600 disabled:pointer-events-none disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 border-b border-neutral-100 px-3 py-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1 px-3 py-2"
        role="radiogroup"
        aria-label="Pick a day"
      >
        {cells.map((date) => {
          const key = displayDate(date);
          const daySlots = slotsByDate.get(key);
          const hasSlots = Boolean(daySlots?.length);
          const inViewMonth =
            date.getMonth() === viewMonth.getMonth();
          const isBeforeToday = date.getTime() < today.getTime();
          const isSelected = selectedDateKey === key;
          const isDisabled = disabled || !inViewMonth || isBeforeToday || !hasSlots;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={date.toDateString()}
              disabled={isDisabled}
              onClick={() => {
                const first = daySlots?.[0];
                if (first) onSelect(first.startTime);
              }}
              className={cn(
                "relative flex h-11 flex-col items-center justify-center rounded-[10px] text-sm font-semibold transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none",
                !inViewMonth && "text-neutral-300 disabled:opacity-40",
                isSelected
                  ? "bg-terracotta-600 text-white"
                  : isBeforeToday || !hasSlots
                    ? "text-neutral-400"
                    : "text-neutral-950 hover:bg-terracotta-100 hover:text-terracotta-700"
              )}
            >
              {date.getDate()}
              {hasSlots && !isSelected ? (
                <span className="mt-1 h-1 w-1 rounded-full bg-terracotta-500" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="border-t border-neutral-100 px-4 py-3">
        {selectedSlot ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
              {new Intl.DateTimeFormat("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(new Date(selectedSlot))}
            </p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Available times">
              {selectedDateSlots.map((slot) => {
                const isSelected = selectedSlot === slot.startTime;
                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={disabled}
                    onClick={() => onSelect(slot.startTime)}
                    className={
                      isSelected
                        ? "rounded-pill border border-terracotta-600 bg-terracotta-600 px-3.5 py-2 font-sans text-xs font-semibold text-white transition-colors duration-[var(--duration-fast)]"
                        : "rounded-pill border border-neutral-300 bg-white px-3.5 py-2 font-sans text-xs font-semibold text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:border-terracotta-600 hover:text-terracotta-600"
                    }
                  >
                    {timeLabel(new Date(slot.startTime))}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-neutral-500">
            {durationMinutes
              ? `Sessions are ${durationMinutes} minutes. Select a day with available times, then choose a start time.`
              : "Select a day with available times, then choose a start time."}
          </p>
        )}
      </div>
    </div>
  );
}
