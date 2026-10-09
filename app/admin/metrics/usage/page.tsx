import "server-only";

import type { Metadata } from "next";
import {
  Activity,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  GraduationCap,
  Inbox,
  UserPlus,
  Users,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/admin";
import { getUsageMetrics } from "@/lib/services/metrics-service";
import { AreaTrendChart } from "@/components/admin/metrics/area-trend-chart";
import { MetricsHeader } from "@/components/admin/metrics/metrics-header";
import { SectionCard } from "@/components/admin/metrics/section-card";
import { StatCard } from "@/components/admin/metrics/stat-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usage metrics | Rapid Launch",
};

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const data = await getUsageMetrics(params.window ?? "30d");
  const {
    window,
    activeEnrollments,
    enrolledInWindow,
    activeLearners,
    uniqueLearners,
    startedCourses,
    completedLessonsTotal,
    avgLessonsPerLearner,
    purchasedEnrollmentsInWindow,
    bonusEnrollmentsInWindow,
    enrollmentsTrend,
    bookingsConfirmed,
    bookingsPending,
    bookingsCancelled,
    leadsInWindow,
    leadsTotal,
  } = data;

  const enrollmentPoints = enrollmentsTrend.map((point) => {
    const value = point.purchased + point.bonus;
    return { label: point.label, value, valueLabel: value.toLocaleString() };
  });
  const enrollmentsInWindow = enrollmentPoints.reduce(
    (sum, point) => sum + point.value,
    0
  );

  return (
    <div className="admin-enter flex flex-1 flex-col">
      <MetricsHeader
        title="Usage metrics"
        subtitle="Course engagement, bookings and lead volume over time."
        windowKey={window.key}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Active enrollments"
          value={activeEnrollments.toLocaleString()}
          icon={GraduationCap}
        />
        <StatCard
          label="Enrolled in window"
          value={enrolledInWindow.toLocaleString()}
          icon={UserPlus}
          tone="success"
        />
        <StatCard
          label="Active learners"
          value={activeLearners.toLocaleString()}
          icon={Activity}
          tone="info"
        />
        <StatCard
          label="Started courses"
          value={startedCourses.toLocaleString()}
          icon={BookOpen}
        />
        <StatCard
          label="Avg lessons / learner"
          value={avgLessonsPerLearner.toString()}
          icon={BookOpenCheck}
          tone="ai"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AreaTrendChart
          title="Enrollments trend"
          subtitle={`${window.label} · ${enrollmentsInWindow.toLocaleString()} enrollments`}
          totalLabel={enrollmentsInWindow.toLocaleString()}
          points={enrollmentPoints}
        />
        <SectionCard
          title="Learning depth"
          subtitle="Across all active enrollments"
        >
          <ul className="space-y-4">
            <li className="flex items-center justify-between gap-3">
              <span className="text-sm text-neutral-600">
                Lessons completed
              </span>
              <span className="text-lg font-bold tabular-nums text-neutral-950">
                {completedLessonsTotal.toLocaleString()}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-sm text-neutral-600">Unique learners</span>
              <span className="text-lg font-bold tabular-nums text-neutral-950">
                {uniqueLearners.toLocaleString()}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-sm text-neutral-600">
                Purchased this window
              </span>
              <span className="text-lg font-bold tabular-nums text-neutral-950">
                {purchasedEnrollmentsInWindow.toLocaleString()}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-sm text-neutral-600">
                Bonus this window
              </span>
              <span className="text-lg font-bold tabular-nums text-neutral-950">
                {bonusEnrollmentsInWindow.toLocaleString()}
              </span>
            </li>
          </ul>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SectionCard title="Bookings" subtitle="Session activity">
          <ul className="space-y-3">
            <li className="flex items-center gap-3 rounded-[10px] bg-success-100 px-3 py-2.5">
              <CalendarCheck
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-success-600"
              />
              <span className="flex-1 text-sm text-neutral-700">
                Confirmed in window
              </span>
              <span className="font-bold tabular-nums text-neutral-950">
                {bookingsConfirmed.toLocaleString()}
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-[10px] bg-warning-100 px-3 py-2.5">
              <CalendarClock
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-warning-600"
              />
              <span className="flex-1 text-sm text-neutral-700">
                Pending now
              </span>
              <span className="font-bold tabular-nums text-neutral-950">
                {bookingsPending.toLocaleString()}
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-[10px] bg-danger-100 px-3 py-2.5">
              <CalendarX
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-danger-600"
              />
              <span className="flex-1 text-sm text-neutral-700">
                Cancelled in window
              </span>
              <span className="font-bold tabular-nums text-neutral-950">
                {bookingsCancelled.toLocaleString()}
              </span>
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="Leads" subtitle="Inbound interest">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-600">
                <Inbox aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold tabular-nums text-neutral-950">
                  {leadsInWindow.toLocaleString()}
                </p>
                <p className="text-sm text-neutral-500">New in this window</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-lavender-100 text-ink-700">
                <Users aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold tabular-nums text-neutral-950">
                  {leadsTotal.toLocaleString()}
                </p>
                <p className="text-sm text-neutral-500">All-time leads</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Enrollment mix" subtitle="This window">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[12px] bg-terracotta-100 p-4 text-center">
              <p className="text-2xl font-bold tabular-nums text-neutral-950">
                {purchasedEnrollmentsInWindow.toLocaleString()}
              </p>
              <p className="text-sm text-neutral-600">Purchased</p>
            </div>
            <div className="rounded-[12px] bg-ai-violet-soft p-4 text-center">
              <p className="text-2xl font-bold tabular-nums text-neutral-950">
                {bonusEnrollmentsInWindow.toLocaleString()}
              </p>
              <p className="text-sm text-neutral-600">Bonus</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
