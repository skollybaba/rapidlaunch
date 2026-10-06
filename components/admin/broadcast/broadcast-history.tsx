import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { BroadcastHistoryRow } from "@/lib/services/broadcast-service";

function statusTone(status: string): "success" | "pending" | "error" {
  if (status === "COMPLETED") return "success";
  if (status === "PARTIAL") return "pending";
  return "error";
}

export function BroadcastHistory({
  rows,
}: {
  rows: BroadcastHistoryRow[];
}) {
  return (
    <section className="rounded-[20px] border border-neutral-300 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-950">
            Send history
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Every campaign sent from this page, newest first.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No broadcasts yet"
            description="Your first campaign will appear here after you send it."
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
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
      )}
    </section>
  );
}