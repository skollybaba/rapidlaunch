import type { Metadata } from "next";

import { EnrolleeFilters } from "@/components/admin/enrollee-filters";
import { EnrolleesTable } from "@/components/admin/enrollees-table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth/admin";
import { getCourseEnrollees } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enrollees | Rapid Launch Back office",
};

export default async function AdminEnrolleesPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const groups = await getCourseEnrollees();

  const options = groups.map((group) => ({
    value: group.productId,
    label:
      group.productId === "unknown" ? "Unknown course" : group.courseTitle,
    count: group.enrollees.length,
  }));

  const selectedGroup = groups.find((group) => group.productId === sp.course);
  const groupsToShow = selectedGroup ? [selectedGroup] : groups;

  const rows = groupsToShow.flatMap((group) =>
    group.enrollees.map((enrollee) => ({
      id: enrollee.enrollmentId,
      orderId: enrollee.orderId,
      courseTitle:
        group.productId === "unknown"
          ? "Unknown course"
          : (enrollee.courseTitle ?? group.courseTitle),
      customerEmail: enrollee.customerEmail,
      orderReference: enrollee.orderReference,
      status: enrollee.status,
      enrolledAt: enrollee.enrolledAt ?? null,
    }))
  );

  const heading = selectedGroup
    ? `Students enrolled in ${selectedGroup.courseTitle}`
    : `${rows.length} enrollee${rows.length === 1 ? "" : "s"} across ${
        options.length
      } course${options.length === 1 ? "" : "s"}`;

  return (
    <div className="admin-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-950">Enrollees</h1>
        <p className="mt-1 text-sm text-neutral-500">{heading}.</p>
      </div>

      <EnrolleeFilters
        options={options}
        current={selectedGroup?.productId ?? ""}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No enrollees yet"
          description="Once customers purchase courses and are enrolled, they will show up here."
        />
      ) : (
        <EnrolleesTable rows={rows} />
      )}
    </div>
  );
}