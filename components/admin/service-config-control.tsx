"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type InquiryMode = "NONE" | "INTEREST" | "QUOTE";
type FulfillmentMode = "SCHEDULER" | "MANUAL";

const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const INQUIRY_LABELS: Record<InquiryMode, string> = {
  NONE: "Checkout directly",
  INTEREST: "Interest form, then payment",
  QUOTE: "Quote form, no payment",
};

const FULFILLMENT_LABELS: Record<FulfillmentMode, string> = {
  SCHEDULER: "Booked session",
  MANUAL: "Manual onboarding",
};

const SELECT =
  "rounded-sm border border-neutral-300 bg-white px-2 py-1.5 text-xs font-medium text-neutral-800 outline-none focus:border-action disabled:opacity-60";

interface ServiceConfigControlProps {
  serviceId: string;
  initialStatus: Status;
  initialInquiryMode: InquiryMode;
  initialFulfillmentMode?: FulfillmentMode | undefined;
}

export function ServiceConfigControl({
  serviceId,
  initialStatus,
  initialInquiryMode,
  initialFulfillmentMode,
}: ServiceConfigControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [inquiryMode, setInquiryMode] = useState<InquiryMode>(initialInquiryMode);
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode | null>(
    initialFulfillmentMode ?? null
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  async function patch(payload: Record<string, string>) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        ok: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !body.ok) {
        setMessage({
          tone: "error",
          text: body.error?.message ?? "Could not save. Please try again.",
        });
        return;
      }

      setMessage({ tone: "ok", text: "Saved" });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Could not reach the server." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label
          htmlFor={`status-${serviceId}`}
          className="block text-xs font-semibold text-neutral-600"
        >
          Visibility
        </label>
        <select
          id={`status-${serviceId}`}
          value={status}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as Status;
            setStatus(next);
            void patch({ status: next });
          }}
          className={cn(SELECT, "mt-1.5")}
        >
          {(Object.keys(STATUS_LABELS) as Status[]).map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`inquiry-${serviceId}`}
          className="block text-xs font-semibold text-neutral-600"
        >
          How customers buy
        </label>
        <select
          id={`inquiry-${serviceId}`}
          value={inquiryMode}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as InquiryMode;
            setInquiryMode(next);
            void patch({ inquiryMode: next });
          }}
          className={cn(SELECT, "mt-1.5")}
        >
          {(Object.keys(INQUIRY_LABELS) as InquiryMode[]).map((option) => (
            <option key={option} value={option}>
              {INQUIRY_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`fulfil-${serviceId}`}
          className="block text-xs font-semibold text-neutral-600"
        >
          Fulfilment
        </label>
        <select
          id={`fulfil-${serviceId}`}
          value={fulfillmentMode ?? ""}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as FulfillmentMode | "";
            setFulfillmentMode(next || null);
            if (next) void patch({ fulfillmentMode: next });
          }}
          className={cn(SELECT, "mt-1.5")}
        >
          <option value="">Not set</option>
          {(Object.keys(FULFILLMENT_LABELS) as FulfillmentMode[]).map((option) => (
            <option key={option} value={option}>
              {FULFILLMENT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="pb-1">
        {pending ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            Saving
          </span>
        ) : message ? (
          <p
            role="status"
            className={
              message.tone === "ok"
                ? "text-xs font-medium text-emerald-700"
                : "text-xs font-medium text-red-700"
            }
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}