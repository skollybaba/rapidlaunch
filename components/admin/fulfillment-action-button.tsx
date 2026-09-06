"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface FulfillmentActionButtonProps {
  orderId: string;
  children: React.ReactNode;
  className?: string;
  /* Text while the request is running */
  loadingLabel?: string;
  variant?: "terracotta" | "ghost";
}

export function FulfillmentActionButton({
  orderId,
  children,
  className,
  loadingLabel = "Working…",
  variant = "terracotta",
}: FulfillmentActionButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/fulfillments/${encodeURIComponent(orderId)}`,
        { method: "POST" }
      );
      const body = await res.json();
      if (!res.ok) {
        setMessage(body?.error?.message ?? "Action failed. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Action failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-[3px]",
          variant === "terracotta"
            ? "bg-terracotta-600 text-white hover:bg-terracotta-500 disabled:cursor-not-allowed disabled:opacity-60"
            : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="size-3.5" aria-hidden="true" />
        )}
        {pending ? loadingLabel : children}
      </button>
      {message ? (
        <span className="text-xs text-danger-600">{message}</span>
      ) : null}
    </span>
  );
}
