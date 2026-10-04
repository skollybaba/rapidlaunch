"use client";

import { useState } from "react";
import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import { readApiError } from "@/lib/feedback";
import { cn } from "@/lib/utils";

interface DismissBookingButtonProps {
  bookingId: string;
  className?: string;
}

export function DismissBookingButton({
  bookingId,
  className,
}: DismissBookingButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function dismiss() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/bookings/${encodeURIComponent(bookingId)}`,
        { method: "DELETE" }
      );
      const body = await res.json();
      if (!res.ok) {
        const reason = readApiError(body, "Could not clear this booking. Try again.");
        setMessage(reason);
        setConfirming(false);
        toast.error({
          title: reason,
          action: { label: "Retry", onClick: () => void dismiss() },
        });
        return;
      }
      setConfirming(false);
      toast.success({
        title: "Booking cleared",
        description: "It has been removed from the bookings list.",
      });
      router.refresh();
    } catch {
      const reason = "Could not clear this booking. Check your connection.";
      setMessage(reason);
      setConfirming(false);
      toast.error(reason);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      {confirming ? (
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-pill bg-danger-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-[var(--duration-fast)] hover:bg-danger-500 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-[3px] focus:ring-danger-300"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Ban className="size-3.5" aria-hidden="true" />
            )}
            Yes, clear it
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="inline-flex items-center rounded-pill border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-[3px] focus:ring-neutral-300"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-pill border border-danger-200 bg-white px-3 py-1.5 text-xs font-semibold text-danger-600 transition-colors duration-[var(--duration-fast)] hover:bg-danger-50 focus:outline-none focus:ring-[3px] focus:ring-danger-200",
            className
          )}
        >
          <Ban className="size-3.5" aria-hidden="true" />
          Clear from list
        </button>
      )}
      {message ? (
        <span className="text-xs text-danger-600">{message}</span>
      ) : null}
    </span>
  );
}