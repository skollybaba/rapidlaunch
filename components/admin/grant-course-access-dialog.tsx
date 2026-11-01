"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { isApiFailure, readApiError } from "@/lib/feedback";
import { readApiJson } from "@/lib/http";
import type { GrantCourseAccessResult } from "@/types/course-access";

const fieldClasses =
  "mt-1 h-[42px] w-full rounded-[12px] border border-neutral-300 bg-white px-4 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none focus:ring-[3px] focus:ring-[color-mix(in_srgb,var(--color-terracotta-500)_28%,transparent)]";

interface GrantCourseAccessDialogProps {
  userId: string;
  email: string;
  courses: { id: string; title: string }[];
}

/**
 * Per-user entry point for complimentary access on the Users page.
 *
 * The same operation is available from the course editor's access tab; this
 * one starts from the person instead of the course. Either way no order is
 * created and analytics ignore the resulting enrollment.
 */
export function GrantCourseAccessDialog({
  userId,
  email,
  courses,
}: GrantCourseAccessDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    if (submitting) return;
    setOpen(false);
    setNote("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/course-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          userId,
          note: note.trim() || undefined,
        }),
      });
      const json = await readApiJson<GrantCourseAccessResult>(response);
      if (!json?.ok || isApiFailure(json)) {
        throw new Error(
          readApiError(json, "Could not grant access. Please try again.")
        );
      }

      const result = json.data;
      if (result?.alreadyHadAccess) {
        toast.success({
          title: `${email} already had access to that course.`,
          description: "No new seat was created and no email was sent.",
        });
      } else {
        toast.success({
          title: `${email} now has access.`,
          description: result?.emailSent
            ? "We emailed them a link to the course."
            : "Access is active, but the notification email could not be sent.",
        });
      }

      setOpen(false);
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error({
        title:
          error instanceof Error
            ? error.message
            : "Could not grant access. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonStyles({ variant: "secondary", size: "sm" })}
      >
        <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
        Give course access
      </button>

      <dialog
        ref={dialogRef}
        aria-label={`Give course access to ${email}`}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Clicks on the backdrop land on the dialog element itself.
          if (event.target === dialogRef.current) close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-[16px] border border-neutral-300 bg-white p-0 text-neutral-950 shadow-xl backdrop:bg-black/50"
      >
        <form onSubmit={submit} className="p-5">
          <h2 className="text-base font-bold">Give course access</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Complimentary access for <strong>{email}</strong>. No order is
            created and the seat is excluded from analytics.
          </p>

          <label
            htmlFor="grant-course"
            className="mt-4 block text-xs font-semibold text-neutral-500"
          >
            Course
          </label>
          <select
            id="grant-course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className={fieldClasses}
            required
          >
            {courses.length === 0 ? (
              <option value="">No courses available</option>
            ) : (
              courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))
            )}
          </select>

          <label
            htmlFor="grant-note"
            className="mt-4 block text-xs font-semibold text-neutral-500"
          >
            Note (optional, admin only)
          </label>
          <input
            id="grant-note"
            type="text"
            value={note}
            maxLength={280}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why this person has complimentary access"
            className={fieldClasses}
          />

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className={buttonStyles({ variant: "secondary", size: "md" })}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !courseId}
              className={buttonStyles({ variant: "primary", size: "md" })}
            >
              {submitting ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : null}
              Grant access &amp; send email
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
