"use client";

import { useState } from "react";
import { Loader2, MailCheck, Send } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface SendBookingReminderButtonProps {
  bookingId: string;
  className?: string;
}

export function SendBookingReminderButton({
  bookingId,
  className,
}: SendBookingReminderButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendReminder() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/bookings/${encodeURIComponent(bookingId)}/reminder`,
        { method: "POST" }
      );
      const body = await res.json();
      if (!res.ok) {
        setMessage(
          body?.error?.message ??
            "Could not send the reminder. Try again shortly."
        );
        return;
      }
      setSent(true);
      router.refresh();
    } catch {
      setMessage("Could not send the reminder. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill border border-success-200 bg-success-50 px-3 py-1.5 text-xs font-semibold text-success-600">
        <MailCheck className="size-3.5" aria-hidden="true" />
        Reminder sent
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={sendReminder}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill border border-terracotta-200 bg-white px-3 py-1.5 text-xs font-semibold text-terracotta-600 transition-colors duration-[var(--duration-fast)] hover:bg-terracotta-50 focus:outline-none focus:ring-[3px] focus:ring-terracotta-200 disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-3.5" aria-hidden="true" />
        )}
        {pending ? "Sending…" : "Send payment reminder"}
      </button>
      {message ? (
        <span className="text-xs text-danger-600">{message}</span>
      ) : null}
    </span>
  );
}