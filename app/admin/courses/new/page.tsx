import type { Metadata } from "next";
import Link from "next/link";

import { CourseForm } from "@/components/admin/course-form";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New course | Rapid Launch Back office",
};

export default async function AdminNewCoursePage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">
            <Link href="/admin/courses" className="hover:underline">
              Courses
            </Link>{" "}
            / New
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-950">New course</h1>
        </div>
      </div>
      <CourseForm />
    </div>
  );
}
