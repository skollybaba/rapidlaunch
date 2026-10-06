"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export interface ScheduleSendDialogProps {
  open: boolean;
  onClose: () => void;
  /** Receives the picked moment as an ISO string. */
  onConfirm: (iso: string) => void;
  recipientCount: number;
  submitting?: boolean;
}

/**
 * Date + time picker for scheduling a broadcast. Built on the native
 * `<dialog>` element (same as the confirm dialog) so focus containment,
 * Escape handling and focus restoration come for free.
 */
export function ScheduleSendDialog({
  open,
  onClose,
  onConfirm,
  recipientCount,
  submitting,
}: ScheduleSendDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    firstOfMonth(new Date())
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      const current = new Date();
      setNow(current);
      setViewMonth(firstOfMonth(current));
      setSelectedDate(null);
      setTime("09:00");
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-schedule-initial-focus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const scheduledFor = useMemo(() => {
    if (!selectedDate) return null;
    const [hours, minutes] = time.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes,
      0,
      0
    );
  }, [selectedDate, time]);

  // A minute of headroom keeps a "now" pick from racing the server-side
  // future check while the request is in flight.
  const isPast = scheduledFor
    ? scheduledFor.getTime() <= now.getTime() + 30_000
    : false;
  const canConfirm = Boolean(scheduledFor) && !isPast && !submitting;

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
      grid.push(
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      );
    }
    return grid;
  }, [viewMonth]);

  const today = startOfDay(now);
  const canGoPrevious =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() &&
      viewMonth.getMonth() > today.getMonth());

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(viewMonth);

  function moveMonth(delta: number) {
    setViewMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="schedule-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-[20px] bg-white p-0 shadow-2xl backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-600">
            <CalendarClock aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="schedule-dialog-title" className="text-lg font-bold text-neutral-950">
              Schedule this email
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Pick a date and time — it will be sent automatically to{" "}
              {recipientCount.toLocaleString()} recipient
              {recipientCount === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-950">{monthLabel}</p>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous month"
                disabled={!canGoPrevious}
                onClick={() => moveMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-pill border border-neutral-300 text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:border-terracotta-600 hover:text-terracotta-600 disabled:pointer-events-none disabled:opacity-40"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => moveMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-pill border border-neutral-300 text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:border-terracotta-600 hover:text-terracotta-600"
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
              const inViewMonth = date.getMonth() === viewMonth.getMonth();
              const isBeforeToday = startOfDay(date).getTime() < today.getTime();
              const isSelected =
                selectedDate !== null &&
                date.getFullYear() === selectedDate.getFullYear() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getDate() === selectedDate.getDate();
              const isDisabled = !inViewMonth || isBeforeToday;
              return (
                <button
                  key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={date.toDateString()}
                  disabled={isDisabled}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "flex h-11 flex-col items-center justify-center rounded-[10px] text-sm font-semibold transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none",
                    !inViewMonth && "text-neutral-300 disabled:opacity-40",
                    isSelected
                      ? "bg-terracotta-600 text-white"
                      : isBeforeToday
                        ? "text-neutral-400"
                        : "text-neutral-950 hover:bg-terracotta-100 hover:text-terracotta-600"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-neutral-100 px-4 py-3">
            <div>
              <label
                htmlFor="schedule-time"
                className="block text-xs font-semibold text-neutral-500"
              >
                Send time
              </label>
              <input
                id="schedule-time"
                data-schedule-initial-focus
                type="time"
                step={300}
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="mt-1.5 rounded-[12px] border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 transition-colors duration-[var(--duration-fast)] focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]"
              />
            </div>
            <p className="pb-2 text-right text-xs text-neutral-500">
              {selectedDate && scheduledFor && !isPast
                ? formatDateTime(scheduledFor)
                : "Times are your local time."}
            </p>
          </div>
        </div>

        {isPast ? (
          <p role="alert" className="mt-3 text-sm text-danger-600">
            Pick a time at least a minute from now.
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className={buttonStyles({ variant: "secondary" })}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canConfirm || !scheduledFor) return;
              onConfirm(scheduledFor.toISOString());
            }}
            disabled={!canConfirm}
            className={buttonStyles({ variant: "primary" })}
          >
            {submitting ? "Scheduling…" : "Schedule email"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
