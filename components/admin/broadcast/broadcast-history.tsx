import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDateTime } from "@/lib/utils";
import type {
  BroadcastHistoryRow,
  BroadcastScheduledRow,
} from "@/lib/services/broadcast-service";

function statusTone(status: string): "success" | "pending" | "error" {
  if (status === "COMPLETED") return "success";
  if (status === "PARTIAL") return "pending";
  return "error";
}

type HistoryTab = "sent" | "scheduled";

function tabHref(tab: HistoryTab): string {
  return `/admin/email-broadcast?tab=${tab}`;
}

function PendingBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} scheduled email${count === 1 ? "" : "s"} waiting to send`}
      className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta-600 px-1.5 text-[11px] font-bold leading-none text-white"
    >
      {count}
    </span>
  );
}

function SentTable({ rows }: { rows: BroadcastHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No broadcasts yet"
        description="Your first campaign will appear here after you send it."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="rounded-tl-[12px] px-5 py-3 font-semibold">
              Campaign
            </th>
            <th className="px-5 py-3 font-semibold">Audience</th>
            <th className="px-5 py-3 font-semibold">Recipients</th>
            <th className="px-5 py-3 font-semibold">Delivered</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="rounded-tr-[12px] px-5 py-3 font-semibold">
              Sent by / At
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-neutral-50">
              <td className="px-5 py-4">
                <p className="font-medium text-neutral-950">{row.title}</p>
                <p className="text-xs text-neutral-500">{row.subject}</p>
              </td>
              <td className="px-5 py-4 text-neutral-700">
                {row.segmentLabel}
              </td>
              <td className="px-5 py-4 text-neutral-700">
                {row.recipientCount.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-neutral-700">
                {row.sentCount.toLocaleString()}
                {row.failedCount > 0 ? (
                  <span className="text-amber-600">
                    {" "}
                    · {row.failedCount.toLocaleString()} failed
                  </span>
                ) : null}
              </td>
              <td className="px-5 py-4">
                <Badge tone={statusTone(row.status)}>{row.status}</Badge>
              </td>
              <td className="px-5 py-4 text-neutral-600">
                <p>{row.createdByEmail}</p>
                <p className="text-xs text-neutral-400">
                  {row.createdAt ? formatDateTime(row.createdAt) : "—"}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduledTable({ rows }: { rows: BroadcastScheduledRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No scheduled emails"
        description="Emails you schedule from the composer will wait here until their send time."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="rounded-tl-[12px] px-5 py-3 font-semibold">
              Campaign
            </th>
            <th className="px-5 py-3 font-semibold">Audience</th>
            <th className="px-5 py-3 font-semibold">Recipients</th>
            <th className="px-5 py-3 font-semibold">Scheduled for</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="rounded-tr-[12px] px-5 py-3 font-semibold">
              Scheduled by
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-neutral-50">
              <td className="px-5 py-4">
                <p className="font-medium text-neutral-950">{row.title}</p>
                <p className="text-xs text-neutral-500">{row.subject}</p>
              </td>
              <td className="px-5 py-4 text-neutral-700">
                {row.segmentLabel}
              </td>
              <td className="px-5 py-4 text-neutral-700">
                {row.recipientCount.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-neutral-700">
                {row.scheduledFor ? formatDateTime(row.scheduledFor) : "—"}
              </td>
              <td className="px-5 py-4">
                <Badge tone="pending">SCHEDULED</Badge>
              </td>
              <td className="px-5 py-4 text-neutral-600">
                {row.createdByEmail}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BroadcastHistory({
  rows,
  scheduledRows,
  pendingCount,
  activeTab,
}: {
  rows: BroadcastHistoryRow[];
  scheduledRows: BroadcastScheduledRow[];
  pendingCount: number;
  activeTab: HistoryTab;
}) {
  const tabs: { id: HistoryTab; label: string }[] = [
    { id: "sent", label: "Sent" },
    { id: "scheduled", label: "Scheduled" },
  ];

  return (
    <section className="rounded-[20px] border border-neutral-300 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-950">
            Send history
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Campaigns sent from this page, plus anything waiting to go out.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 rounded-pill border border-neutral-300 bg-white p-1"
          role="group"
          aria-label="Send history view"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <a
                key={tab.id}
                href={tabHref(tab.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
                  active
                    ? "bg-neutral-950 text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                )}
              >
                {tab.label}
                {tab.id === "scheduled" ? <PendingBadge count={pendingCount} /> : null}
              </a>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {activeTab === "scheduled" ? (
          <ScheduledTable rows={scheduledRows} />
        ) : (
          <SentTable rows={rows} />
        )}
      </div>
    </section>
  );
}
