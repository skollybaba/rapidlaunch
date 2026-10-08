"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Users, X } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type {
  EmailSequenceSubscriber,
  EmailSequenceSubscriberStatus,
} from "@/types/email-sequence";

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

type StatusFilter = "all" | EmailSequenceSubscriberStatus;

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const EMPTY_COUNTS = { all: 0, pending: 0, completed: 0, cancelled: 0 };

const SEARCH_DEBOUNCE_MS = 300;

export function SequenceCustomersDialog({
  sequence,
  onClose,
}: SequenceCustomersDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [subscribers, setSubscribers] = useState<EmailSequenceSubscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [prevSequenceId, setPrevSequenceId] = useState<string | null>(null);
  const [prevRequestKey, setPrevRequestKey] = useState<string | null>(null);

  const sequenceId = sequence?._id ?? null;
  const isFiltered = status !== "all" || activeQuery.length > 0;
  const requestKey = `${sequenceId ?? ""}|${status}|${activeQuery}`;

  // Reset the list whenever a different sequence (or none) is selected.
  // Setting state during render — guarded by a previous-value check — is how
  // React recommends resetting derived state when a prop identity changes.
  if (sequenceId !== prevSequenceId) {
    setPrevSequenceId(sequenceId);
    setSubscribers([]);
    setTotal(0);
    setCounts(EMPTY_COUNTS);
    setError(null);
    setQuery("");
    setActiveQuery("");
    setStatus("all");
  }

  // Enter the loading state when the search term or status tab changes, again
  // during render so the effect never has to set state synchronously.
  if (requestKey !== prevRequestKey) {
    setPrevRequestKey(requestKey);
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

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(
      () => setActiveQuery(query.trim()),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!sequenceId) return;

    let cancelled = false;

    const params = new URLSearchParams({ limit: "300" });
    if (status !== "all") params.set("status", status);
    if (activeQuery) params.set("q", activeQuery);

    fetch(
      `/api/admin/email-sequences/${sequenceId}/subscribers?${params.toString()}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setSubscribers(data.data?.subscribers ?? []);
          setTotal(data.data?.total ?? 0);
          setCounts({ ...EMPTY_COUNTS, ...(data.data?.counts ?? {}) });
          setError(null);
        } else {
          setError(data.error?.message ?? "Could not load customers.");
        }
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
  }, [sequenceId, status, activeQuery]);

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
              {isFiltered
                ? `${total === 1 ? "1 customer" : `${total} customers`} matching this view`
                : `${total === 1 ? "1 customer" : `${total} customers`} being tracked`}
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

        <div className="border-b border-neutral-200 px-6 pt-4">
          <div className="relative">
            <label htmlFor="sequence-customers-search" className="sr-only">
              Search customers by name or email
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            />
            <input
              id="sequence-customers-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              autoComplete="off"
              className="w-full rounded-[12px] border border-neutral-300 bg-white py-2.5 pl-9 pr-4 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-terracotta-600 focus:outline-none"
            />
          </div>

          <div
            role="tablist"
            aria-label="Customer status"
            className="mt-3 flex flex-wrap gap-1"
          >
            {STATUS_TABS.map((tab) => {
              const selected = status === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`sequence-customers-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls="sequence-customers-panel"
                  onClick={() => setStatus(tab.id)}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-t-[10px] px-3 py-2 text-sm font-semibold transition-colors",
                    selected
                      ? "text-terracotta-600"
                      : "text-neutral-500 hover:text-neutral-800"
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs font-medium",
                      selected
                        ? "bg-terracotta-600 text-white"
                        : "bg-neutral-100 text-neutral-600"
                    )}
                  >
                    {counts[tab.id]}
                  </span>
                  {selected ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-terracotta-600"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="sequence-customers-panel"
          role="tabpanel"
          aria-labelledby={`sequence-customers-tab-${status}`}
          className="max-h-[55vh] min-h-64 overflow-y-auto px-6 py-4"
        >
          <p className="sr-only" aria-live="polite">
            {loading
              ? "Loading customers"
              : `${total} ${total === 1 ? "customer" : "customers"} shown`}
          </p>
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
            isFiltered ? (
              <EmptyState
                title="No matching customers"
                description="No customer matches this search and status. Try a different name, email, or status tab."
              />
            ) : (
              <EmptyState
                title="No customers yet"
                description="Nobody has subscribed to this sequence so far. Once they do, you'll see them here."
              />
            )
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
