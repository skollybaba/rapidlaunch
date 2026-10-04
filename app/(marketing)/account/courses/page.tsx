import type { Metadata } from "next";
import { ExternalLink, GraduationCap } from "lucide-react";
import { notFound } from "next/navigation";

import { AccountNav } from "@/components/account/account-nav";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getEnrollmentsForUser } from "@/lib/services/lms-service";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My courses | Rapid Launch",
};

export default async function AccountCoursesPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const courses = await getEnrollmentsForUser(String(user._id));

  return (
    <div className="flex flex-1 flex-col bg-paper-50">
      <div className="mx-auto w-[98%] flex-1 px-6 py-16 md:w-[min(83%,96rem)] lg:px-8 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta-600">
          My account
        </p>
        <h1 className="mt-2 text-[38px] leading-[1.286] md:text-[1.75rem]">
          Courses
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <AccountNav />

          <div>
            {courses.length ? (
              <ul className="space-y-3">
                {courses.map((course) => {
                  const started = course.completedLessons > 0;
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
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-neutral-950">
                              {course.courseTitle}
                            </p>
                            {course.isBonus ? (
                              <Badge tone="info">Bonus</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-neutral-500">
                            Enrolled {formatDate(course.enrolledAt)}
                            {course.lastAccessedAt
                              ? ` · Last opened ${formatDate(course.lastAccessedAt)}`
                              : ""}
                          </p>
                          <div className="mt-3 flex items-center gap-3 sm:max-w-xs">
                            <div
                              className="h-1.5 flex-1 overflow-hidden rounded-pill bg-neutral-200"
                              role="progressbar"
                              aria-valuenow={course.progressPercent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${course.courseTitle} progress`}
                            >
                              <div
                                className="h-full rounded-pill bg-terracotta-600"
                                style={{ width: `${course.progressPercent}%` }}
                              />
                            </div>
                            <span className="whitespace-nowrap text-xs font-medium text-neutral-500">
                              {course.completedLessons}/{course.totalLessons}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:shrink-0">
                        <Badge tone={started ? "pending" : "success"}>
                          {course.progressPercent >= 100
                            ? "Completed"
                            : started
                              ? "In progress"
                              : "Not started"}
                        </Badge>
                        <a
                          href={`/learn/${course.courseSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonStyles({ variant: "primary" })}
                        >
                          <ExternalLink aria-hidden="true" className="h-4 w-4" />
                          Go to class
                        </a>
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
