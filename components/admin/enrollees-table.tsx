"use client";

import { useState } from "react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";

export interface EnrolleeViewRow {
  id: string;
  courseTitle: string;
  customerEmail: string;
  orderReference: string;
  status: string;
  enrolledAt: string | null;
}

function statusTone(status: string): BadgeTone {
  switch (status) {
    case "FULFILLED":
      return "success";
    case "PENDING":
      return "pending";
    case "ACTION_REQUIRED":
      return "info";
    default:
      return "error";
  }
}

const checkboxClasses =
  "size-4 rounded border-neutral-300 accent-terracotta-600 focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

export function EnrolleesTable({ rows }: { rows: EnrolleeViewRow[] }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-[12px] border border-terracotta-100 bg-terracotta-100/40 px-4 py-3"
        >
          <p className="text-sm font-medium text-neutral-900">
            {selected.size} enrollee{selected.size === 1 ? "" : "s"} selected
          </p>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="rounded-pill border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors duration-[var(--duration-fast)] hover:bg-neutral-100"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all enrollees"
                    checked={allSelected}
                    onChange={toggleAll}
                    className={checkboxClasses}
                  />
                </th>
                <th className="px-5 py-3 font-semibold">Student</th>
                <th className="px-5 py-3 font-semibold">Course</th>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Enrolled</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors duration-[var(--duration-fast)]",
                      isSelected
                        ? "bg-terracotta-100/30"
                        : "hover:bg-neutral-50"
                    )}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.customerEmail}`}
                        checked={isSelected}
                        onChange={() => toggle(row.id)}
                        className={checkboxClasses}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-neutral-950">
                        {row.customerEmail}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {row.courseTitle}
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {row.orderReference}
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {row.enrolledAt ? (
                        formatDateTime(row.enrolledAt)
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone(row.status)}>
                        {row.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}