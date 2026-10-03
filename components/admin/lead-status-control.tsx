"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/types/lead";

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-neutral-100 text-action",
  CONTACTED: "bg-sky-100 text-sky-800",
  QUALIFIED: "bg-indigo-100 text-indigo-800",
  QUOTED: "bg-amber-100 text-amber-900",
  CLOSED_WON: "bg-emerald-100 text-emerald-900",
  CLOSED_LOST: "bg-neutral-200 text-neutral-700",
};

interface LeadStatusControlProps {
  leadId: string;
  initialStatus: LeadStatus;
  initialNotes?: string | null;
}

/**
 * Status and internal notes are persisted through the admin API. There is no
 * client-side store of enquiry data, so notes are never left in local storage
 * on a shared machine.
 */
export function LeadStatusControl({
  leadId,
  initialStatus,
  initialNotes,
}: LeadStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  async function save(nextStatus: LeadStatus, nextNotes: string) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          notes: nextNotes.trim() ? nextNotes : undefined,
        }),
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

      setStatus(nextStatus);
      setSavedNotes(nextNotes);
      setMessage({ tone: "ok", text: "Saved" });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Could not reach the server." });
    } finally {
      setPending(false);
    }
  }

  const dirty = notes !== savedNotes;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={`status-${leadId}`}
          className="text-xs font-semibold text-neutral-600"
        >
          Status
        </label>
        <select
          id={`status-${leadId}`}
          value={status}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as LeadStatus;
            void save(next, notes);
          }}
          className="rounded-sm border border-neutral-300 bg-white px-2 py-1.5 text-xs font-medium text-neutral-800 outline-none focus:border-action disabled:opacity-60"
        >
          {LEAD_STATUSES.map((option) => (
            <option key={option} value={option}>
              {LEAD_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
        >
          {LEAD_STATUS_LABELS[status]}
        </span>
      </div>

      <div>
        <label
          htmlFor={`notes-${leadId}`}
          className="block text-xs font-semibold text-neutral-600"
        >
          Internal notes
        </label>
        <textarea
          id={`notes-${leadId}`}
          rows={3}
          value={notes}
          disabled={pending}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Quote sent, call booked, decision pending…"
          className="mt-1.5 w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-action"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => void save(status, notes)}
          className="inline-flex items-center gap-1.5 rounded-sm bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          Save notes
        </button>
        {message ? (
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