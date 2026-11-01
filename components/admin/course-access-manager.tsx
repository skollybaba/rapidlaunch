"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, UserPlus, X } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { isApiFailure, readApiError } from "@/lib/feedback";
import { readApiJson } from "@/lib/http";
import type {
  CourseAccessCandidate,
  CourseAccessRow,
} from "@/types/course-access";
import type { EnrollmentAccessSource } from "@/types/lms";
import { formatDate } from "@/lib/utils";

const SOURCE_LABELS: Record<EnrollmentAccessSource, string> = {
  PURCHASE: "Paid",
  BONUS: "Bonus",
  ADMIN_GRANT: "Complimentary",
};

const SOURCE_TONES: Record<EnrollmentAccessSource, BadgeTone> = {
  PURCHASE: "success",
  BONUS: "info",
  ADMIN_GRANT: "pending",
};

const inputClasses =
  "h-[42px] w-full rounded-[12px] border border-neutral-300 bg-white px-4 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

interface CourseAccessManagerProps {
  courseId: string;
  courseTitle: string;
  initialRows: CourseAccessRow[];
}

/**
 * Course editor tab for managing who can open a course.
 *
 * Complimentary grants create an enrollment tagged `ADMIN_GRANT`: the student
 * can open the course, but no order exists and analytics ignore the record.
 */
export function CourseAccessManager({
  courseId,
  courseTitle,
  initialRows,
}: CourseAccessManagerProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [rows, setRows] = useState<CourseAccessRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<CourseAccessCandidate[] | null>(
    null
  );
  const [selected, setSelected] = useState<CourseAccessCandidate | null>(null);
  const [note, setNote] = useState("");
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searching) return;

    setSearching(true);
    try {
      const params = new URLSearchParams({ courseId, q: query.trim() });
      const response = await fetch(
        `/api/admin/course-access/candidates?${params.toString()}`
      );
      const json = await readApiJson<{ candidates: CourseAccessCandidate[] }>(
        response
      );
      if (!json?.ok || isApiFailure(json)) {
        throw new Error(
          readApiError(json, "Could not search accounts. Try again.")
        );
      }
      setCandidates(json.data?.candidates ?? []);
    } catch (error) {
      setCandidates([]);
      toast.error({
        title:
          error instanceof Error
            ? error.message
            : "Could not search accounts. Try again.",
      });
    } finally {
      setSearching(false);
    }
  }

  async function grant() {
    if (!selected || granting) return;

    setGranting(true);
    try {
      const response = await fetch("/api/admin/course-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          userId: selected.id,
          note: note.trim() || undefined,
        }),
      });
      const json = await readApiJson<{
        enrollmentId: string;
        alreadyHadAccess: boolean;
        emailSent: boolean;
      }>(response);
      if (!json?.ok || isApiFailure(json)) {
        throw new Error(
          readApiError(json, "Could not grant access. Try again.")
        );
      }

      const result = json.data;
      if (result?.alreadyHadAccess) {
        toast.success({
          title: `${selected.email} already had access.`,
          description: "No new seat was created and no email was sent.",
        });
      } else {
        setRows((current) => [
          {
            enrollmentId: result?.enrollmentId ?? selected.id,
            userId: selected.id,
            email: selected.email,
            name: selected.name,
            accessSource: "ADMIN_GRANT",
            enrolledAt: new Date().toISOString(),
            lastAccessedAt: null,
            grantNote: note.trim() || null,
          },
          ...current,
        ]);
        toast.success({
          title: `${selected.email} now has access.`,
          description: result?.emailSent
            ? "We emailed them a link to the course."
            : "Access is active, but the notification email could not be sent.",
        });
      }

      setSelected(null);
      setCandidates(null);
      setQuery("");
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error({
        title:
          error instanceof Error
            ? error.message
            : "Could not grant access. Try again.",
      });
    } finally {
      setGranting(false);
    }
  }

  async function revoke(row: CourseAccessRow) {
    const confirmed = await confirm({
      title: `Remove ${row.email}'s access?`,
      description: `They will lose access to ${courseTitle}. Their progress is kept if you grant access again.`,
      confirmLabel: "Remove access",
      tone: "danger",
    });
    if (!confirmed) return;

    setRevokingId(row.enrollmentId);
    try {
      const params = new URLSearchParams({
        courseId,
        userId: row.userId,
      });
      const response = await fetch(
        `/api/admin/course-access?${params.toString()}`,
        { method: "DELETE" }
      );
      const json = await readApiJson(response);
      if (!json?.ok || isApiFailure(json)) {
        throw new Error(
          readApiError(json, "Could not remove access. Try again.")
        );
      }

      setRows((current) =>
        current.filter((item) => item.enrollmentId !== row.enrollmentId)
      );
      toast.success({ title: `${row.email} no longer has access.` });
      router.refresh();
    } catch (error) {
      toast.error({
        title:
          error instanceof Error
            ? error.message
            : "Could not remove access. Try again.",
      });
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[16px] border border-neutral-300 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-neutral-950">
              Give someone access
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Complimentary access. No order is created and the seat is excluded
              from analytics.
            </p>
          </div>
          <Badge tone="neutral">{rows.length} with access</Badge>
        </div>

        <form onSubmit={search} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label
              htmlFor="course-access-search"
              className="block text-xs font-semibold text-neutral-500"
            >
              Find an account
            </label>
            <input
              id="course-access-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Email or name"
              className={`mt-1 ${inputClasses}`}
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            {searching ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Search aria-hidden="true" className="h-4 w-4" />
            )}
            Search
          </button>
        </form>

        {candidates ? (
          candidates.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              No accounts match that search.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100 rounded-[12px] border border-neutral-200">
              {candidates.map((candidate) => {
                const isSelected = selected?.id === candidate.id;
                return (
                  <li
                    key={candidate.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-950">
                        {candidate.name || candidate.email}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {candidate.email}
                      </p>
                    </div>
                    {candidate.hasAccess ? (
                      <Badge tone="neutral">Already has access</Badge>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelected(candidate)}
                        aria-pressed={isSelected}
                        className={buttonStyles({
                          variant: isSelected ? "primary" : "secondary",
                          size: "sm",
                        })}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        ) : null}

        {selected ? (
          <div className="mt-4 rounded-[12px] border border-terracotta-100 bg-terracotta-100/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-neutral-950">
                Granting access to {selected.email}
              </p>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Cancel selection"
                className="rounded-full p-1 text-neutral-500 hover:bg-white hover:text-neutral-950"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <label
              htmlFor="course-access-note"
              className="mt-3 block text-xs font-semibold text-neutral-500"
            >
              Note (optional, admin only)
            </label>
            <input
              id="course-access-note"
              type="text"
              value={note}
              maxLength={280}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why this person has complimentary access"
              className={`mt-1 ${inputClasses}`}
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void grant()}
                disabled={granting}
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                {granting ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus aria-hidden="true" className="h-4 w-4" />
                )}
                Grant access &amp; send email
              </button>
              <p className="text-xs text-neutral-500">
                They can open the course straight away.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-base font-bold text-neutral-950">
          People with access
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Paid, bonus and complimentary seats for this course.
        </p>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-[16px] border border-neutral-300 bg-white p-8 text-center">
            <p className="text-sm text-neutral-500">
              Nobody has access to this course yet.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Access</th>
                    <th className="px-5 py-3 font-semibold">Since</th>
                    <th className="px-5 py-3 font-semibold">Last opened</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((row) => (
                    <tr key={row.enrollmentId} className="hover:bg-neutral-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-neutral-950">
                          {row.name || row.email}
                        </p>
                        <p className="text-xs text-neutral-500">{row.email}</p>
                        {row.grantNote ? (
                          <p className="mt-1 text-xs text-neutral-500">
                            Note: {row.grantNote}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={SOURCE_TONES[row.accessSource]}>
                          {SOURCE_LABELS[row.accessSource]}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-neutral-700">
                        {formatDate(row.enrolledAt)}
                      </td>
                      <td className="px-5 py-4 text-neutral-700">
                        {row.lastAccessedAt
                          ? formatDate(row.lastAccessedAt)
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {row.accessSource === "ADMIN_GRANT" ? (
                          <button
                            type="button"
                            onClick={() => void revoke(row)}
                            disabled={revokingId === row.enrollmentId}
                            className={buttonStyles({
                              variant: "secondary",
                              size: "sm",
                            })}
                          >
                            {revokingId === row.enrollmentId ? (
                              <Loader2
                                aria-hidden="true"
                                className="h-3.5 w-3.5 animate-spin"
                              />
                            ) : null}
                            Remove access
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-400">
                            Managed by the order
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
