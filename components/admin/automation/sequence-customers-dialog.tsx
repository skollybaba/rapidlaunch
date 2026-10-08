"use client";

import { useEffect, useRef, useState } from "react";
import { Users, X } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { EmailSequenceSubscriber } from "@/types/email-sequence";

interface SequenceCustomersDialogProps {
  sequence: { _id: string; name: string } | null;
  onClose: () => void;
}

const STATUS_LABEL: Record<EmailSequenceSubscriber["status"], string> = {
  pending: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<EmailSequenceSubscriber["status"], "pending" | "success" | "error"> = {
  pending: "pending",
  completed: "success",
  cancelled: "error",
};

export function SequenceCustomersDialog({
  sequence,
  onClose,
}: SequenceCustomersDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [subscribers, setSubscribers] = useState<EmailSequenceSubscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevSequenceId, setPrevSequenceId] = useState<string | null>(null);

  const sequenceId = sequence?._id ?? null;

  // Reset the list whenever a different sequence (or none) is selected.
  // Setting state during render — guarded by a previous-value check — is how
  // React recommends resetting derived state when a prop identity changes.
  if (sequenceId !== prevSequenceId) {
    setPrevSequenceId(sequenceId);
    setSubscribers([]);
    setTotal(0);
    setError(null);
    setLoading(Boolean(sequenceId));
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (sequence) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [sequence]);

  useEffect(() => {
    if (!sequenceId) return;

    let cancelled = false;

    fetch(`/api/admin/email-sequences/${sequenceId}/subscribers?limit=300`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setSubscribers(data.data?.subscribers ?? []);
          setTotal(data.data?.total ?? 0);
        }
        setError(data.ok ? null : (data.error?.message ?? "Could not load customers."));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load customers.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sequenceId]);

  const isOpen = Boolean(sequence);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="sequence-customers-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-3xl rounded-[20px] bg-white p-0 shadow-2xl backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="sequence-customers-title"
              className="flex items-center gap-2 text-lg font-bold text-neutral-950"
            >
              <Users aria-hidden="true" className="size-5 text-neutral-400" />
              Customers in {sequence?.name ?? ""}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              {total === 1 ? "1 customer" : `${total} customers`} being tracked
            </p>
          </div>
          <button
            type="button"
            data-customers-initial-focus
            onClick={onClose}
            aria-label="Close customers list"
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="max-h-[55vh] min-h-64 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading customers">
              <div className="h-10 rounded-lg bg-neutral-100 animate-pulse" />
              <div className="h-10 rounded-lg bg-neutral-100 animate-pulse" />
              <div className="h-10 rounded-lg bg-neutral-100 animate-pulse" />
            </div>
          ) : error ? (
            <EmptyState
              title="Could not load customers"
              description={error}
            />
          ) : subscribers.length === 0 ? (
            <EmptyState
              title="No customers yet"
              description="Nobody has subscribed to this sequence so far. Once they do, you'll see them here."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                      <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Email</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                      <th scope="col" className="py-2 font-semibold">Last email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub) => (
                      <tr key={sub._id} className="border-b border-neutral-100 last:border-0">
                        <td className="py-3 pr-4 font-medium text-neutral-950">
                          {sub.name || "—"}
                        </td>
                        <td className="py-3 pr-4 text-neutral-600">{sub.email}</td>
                        <td className="py-3 pr-4">
                          <Badge tone={STATUS_TONE[sub.status]}>
                            {STATUS_LABEL[sub.status]}
                          </Badge>
                        </td>
                        <td className="py-3 text-neutral-600">
                          {sub.lastSentAt
                            ? new Date(sub.lastSentAt).toLocaleDateString()
                            : "Not sent yet"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {subscribers.length < total ? (
                <p className="mt-3 text-xs text-neutral-500">
                  Showing the first {subscribers.length} of {total} customers.
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-neutral-200 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={!isOpen}>
            Done
          </Button>
        </div>
      </div>
    </dialog>
  );
}