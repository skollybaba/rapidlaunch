import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseForm } from "@/components/admin/course-form";
import { requireAdmin } from "@/lib/auth/admin";
import { getCourseById } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit course | Rapid Launch Back office",
};

export default async function AdminEditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const course = await getCourseById(id);
  if (!course) notFound();

  const initial = {
    ...course,
    id: String(course._id),
    courseDetails: course.courseDetails ?? null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">
            <Link href="/admin/courses" className="hover:underline">
              Courses
            </Link>{" "}
            / Edit
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-950">
            {course.title}
          </h1>
        </div>
      </div>
      <CourseForm initial={initial} />
    </div>
  );
}
