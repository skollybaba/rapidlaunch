import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminCourses } from "@/lib/services/admin-service";
import { formatPrice, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Courses | Rapid Launch Back office",
};

function statusTone(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "DRAFT":
      return "pending";
    default:
      return "neutral";
  }
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const data = await getAdminCourses({
    q: sp.q ?? "",
    status: sp.status ?? "",
  });

  return (
    <div className="admin-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Courses</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Create and update the courses shown on your site.
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="rounded-pill bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terracotta-500"
        >
          New course
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search by title or slug"
            className="w-full rounded-[12px] border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-950 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="h-[42px] rounded-pill bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Search
        </button>
      </form>

      {data.rows.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create your first course to get started."
          action={
            <Link
              href="/admin/courses/new"
              className="rounded-pill bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              New course
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-neutral-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Course</th>
                  <th className="px-5 py-3 font-semibold">Slug</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Featured</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.rows.map((course) => (
                  <tr key={course.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="font-medium text-terracotta-600 hover:underline"
                      >
                        {course.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-neutral-700">{course.slug}</td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone(course.status)}>{course.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {formatPrice(course.priceMinor, course.currency)}
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {course.featured ? "Yes" : "No"}
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {formatDate(course.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
