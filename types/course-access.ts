import type { EnrollmentAccessSource } from "@/types/lms";

/**
 * Admin-facing views for complimentary course access. Kept out of the service
 * module so client components can import the types without pulling in
 * server-only code.
 */

export interface CourseAccessRow {
  enrollmentId: string;
  userId: string;
  email: string;
  name?: string;
  accessSource: EnrollmentAccessSource;
  enrolledAt: string;
  lastAccessedAt: string | null;
  /** Email of the admin who granted complimentary access, when known. */
  grantedByEmail?: string;
  grantNote?: string | null;
}

export interface CourseAccessCandidate {
  id: string;
  email: string;
  name?: string;
  /** True when the student already has active access to this course. */
  hasAccess: boolean;
}

export interface GrantCourseAccessResult {
  enrollmentId: string;
  created: boolean;
  /** True when the student already had access, so no new seat was created. */
  alreadyHadAccess: boolean;
  /** False when the notification could not be delivered; access still stands. */
  emailSent: boolean;
  user: { id: string; email: string; name?: string };
}
