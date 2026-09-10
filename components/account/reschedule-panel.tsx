"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  SchedulerCalendar,
  type SchedulerSlot,
} from "@/components/checkout/scheduler-calendar";
import { buttonStyles } from "@/components/ui/button";
import { readApiJson } from "@/lib/http";

type SlotStatus = "idle" | "loading" | "ready" | "empty" | "unavailable";

type SubmitState = "idle" | "submitting" | "success" | "error";

interface ReschedulePanelProps {
  bookingId: string;
  durationMinutes?: number | null;
  timezone?: string | null;
}

function displayTime(iso: string, timezone?: string | null): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone || undefined,
  }).format(new Date(iso));
}

export function ReschedulePanel({
  bookingId,
  durationMinutes,
  timezone,
}: ReschedulePanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<SchedulerSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slotStatus, setSlotStatus] = useState<SlotStatus>("idle");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [successTime, setSuccessTime] = useState("");
  const [successMeetingUrl, setSuccessMeetingUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setSlotStatus("loading");
      const duration = durationMinutes ?? 90;
      const tz =
        timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "Africa/Lagos";
      try {
        const response = await fetch(
          `/api/calendar/availability?days=30&durationMinutes=${duration}&timezone=${encodeURIComponent(tz)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );
        const json = await response.json();
        if (cancelled) return;
        if (!json.ok) {
          setSlotStatus("unavailable");
          return;
        }
        const data = json.data as { slots: SchedulerSlot[] };
        if (!data.slots?.length) {
          setSlotStatus("empty");
          return;
        }
        setSlots(data.slots);
        setSlotStatus("ready");
      } catch {
        if (!cancelled) setSlotStatus("unavailable");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, durationMinutes, timezone]);

  function handleOpen() {
    setOpen((prev) => !prev);
    setMessage("");
    if (open) return;
    setSelectedSlot("");
    setSubmitState("idle");
  }

  async function confirmReschedule() {
    if (!selectedSlot || submitState === "submitting") return;
    const slot = slots.find((s) => s.startTime === selectedSlot);
    if (!slot) return;
    setSubmitState("submitting");
    setMessage("");
    try {
      const response = await fetch(
        `/api/account/sessions/${bookingId}/reschedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime: slot.startTime,
            endTime: slot.endTime,
          }),
        }
      );
      const json = await readApiJson<{
        scheduledStartTime: string;
        meetingUrl?: string | null;
      }>(response);
      if (!json?.ok) {
        throw new Error(
          json?.error?.message ?? "Could not reschedule your session."
        );
      }
      setSuccessTime(displayTime(json.data!.scheduledStartTime, timezone));
      setSuccessMeetingUrl(json.data?.meetingUrl ?? "");
      setSubmitState("success");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setSubmitState("error");
      setMessage(
        err instanceof Error ? err.message : "Could not reschedule your session."
      );
    }
  }

  if (submitState === "success") {
    return (
      <div className="mt-3">
        <p role="status" className="text-sm font-medium text-success-600">
          Rescheduled for {successTime}.
        </p>
        {successMeetingUrl ? (
          <a
            href={successMeetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-medium text-terracotta-600 hover:text-terracotta-500"
          >
            Join session &rarr;
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleOpen}
        className={buttonStyles({ variant: "secondary", size: "md" })}
      >
        {open ? "Cancel" : "Reschedule"}
      </button>

      {open ? (
        <div className="mt-3 rounded-[16px] border border-neutral-300 bg-white p-4 sm:p-5">
          <p className="text-sm font-medium text-neutral-950">
            Pick a new time for your session
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-500">
            {durationMinutes
              ? `Each session is ${durationMinutes} minutes. Choose any available slot and it will be applied right away.`
              : "Choose any available slot and it will be applied right away."}
          </p>

          {slotStatus === "loading" ? (
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              Loading available times…
            </p>
          ) : slotStatus === "unavailable" ? (
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              We could not load available times right now. Please try again in a
              moment.
            </p>
          ) : slotStatus === "empty" ? (
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              No times are available in the next few weeks. Please contact
              support and we will arrange a new time with you.
            </p>
          ) : (
            <>
              <SchedulerCalendar
                slots={slots}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
                disabled={submitState === "submitting"}
                durationMinutes={durationMinutes ?? undefined}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!selectedSlot || submitState === "submitting"}
                  onClick={() => void confirmReschedule()}
                  className={buttonStyles({ variant: "primary", size: "md" })}
                >
                  {submitState === "submitting"
                    ? "Confirming…"
                    : "Confirm new time"}
                </button>
                {submitState === "error" ? (
                  <p role="alert" className="text-sm text-danger-600">
                    {message}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}