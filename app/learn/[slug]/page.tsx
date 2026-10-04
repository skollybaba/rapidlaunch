import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CoursePlayer } from "@/components/learn/course-player";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCourseOutlineForUser,
  LmsServiceError,
} from "@/lib/services/lms-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Course player | Rapid Launch",
  robots: { index: false, follow: false },
};

export default async function LearnCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) notFound();

  // Missing course and missing enrollment are both rendered as a 404 so a slug
  // cannot be used to probe which courses exist.
  const outline = await getCourseOutlineForUser(String(user._id), slug).catch(
    (error) => {
      if (error instanceof LmsServiceError) notFound();
      throw error;
    }
  );

  return <CoursePlayer outline={outline} />;
}
