import type { Metadata } from "next";
import { ExternalLink, GraduationCap } from "lucide-react";
import { notFound } from "next/navigation";

import { AccountNav } from "@/components/account/account-nav";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getCoursesForUser } from "@/lib/services/account-service";
import { formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My courses | Rapid Launch",
};

function enrollmentMeta(status: string): { label: string; tone: "success" | "pending" | "error" | "neutral" } {
  switch (status) {
    case "FULFILLED":
      return { label: "Enrolled", tone: "success" };
    case "PENDING":
    case "RETRY_PENDING":
      return { label: "Enrolling…", tone: "pending" };
    case "ACTION_REQUIRED":
    case "FAILED":
      return { label: "Action required", tone: "error" };
    default:
      return { label: status, tone: "neutral" };
  }
}

export default async function AccountCoursesPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const courses = await getCoursesForUser(String(user._id));

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[98%] md:w-[min(83%,96rem)] flex-1 px-6 py-16 lg:px-8 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          My account
        </p>
        <h1 className="mt-2 text-[1.75rem] leading-[1.286]">Courses</h1>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <AccountNav />

          <div>
            {courses.length ? (
              <ul className="space-y-3">
                {courses.map((course) => {
                  const meta = enrollmentMeta(course.enrollmentStatus);
                  return (
                    <li
                      key={course.id}
                      className="flex flex-col gap-4 rounded-[12px] border border-neutral-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-lavender-100 text-ink-700">
                          <GraduationCap aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-neutral-950">
                            {course.title}
                          </p>
                          <p className="mt-1 text-sm text-neutral-500">
                            Purchased {formatDate(course.purchasedAt)} ·{" "}
                            {formatPrice(course.priceMinor, course.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:shrink-0">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {course.enrollmentStatus === "FULFILLED" &&
                        course.courseUrl ? (
                          <a
                            href={course.courseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonStyles({ variant: "primary" })}
                          >
                            <ExternalLink aria-hidden="true" className="h-4 w-4" />
                            Open in Google Classroom
                          </a>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-[16px] border border-neutral-300 bg-white p-10 text-center">
                <GraduationCap
                  aria-hidden="true"
                  className="mx-auto h-10 w-10 text-neutral-300"
                />
                <p className="mt-4 text-neutral-500">
                  You haven&apos;t purchased any courses yet. When you buy a
                  course while signed in, it shows up here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
