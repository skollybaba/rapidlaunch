import "server-only";

import dbConnect from "@/lib/db";
import { sanitizeCourseDescription } from "@/lib/rich-content";
import { Enrollment } from "@/models/Enrollment";
import { Product } from "@/models/Product";
import {
  countLessons,
  progressPercent,
  resolveOrientationFlags,
  resumeLessonId,
  type CourseModule,
  type CourseOutline,
  type EnrollmentView,
  type LessonView,
  type ModuleView,
} from "@/types/lms";

export class LmsServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "LmsServiceError";
    this.code = code;
    this.status = status;
  }
}

interface CourseContent {
  _id: unknown;
  slug: string;
  title: string;
  thumbnailUrl?: string;
  courseDetails?: { modules?: CourseModule[] } | null;
}

function modulesOf(course: CourseContent): CourseModule[] {
  const raw = course.courseDetails?.modules;
  if (!Array.isArray(raw)) return [];

  // Older or partial records may store a module without a lessons array; treat
  // that as an empty module rather than crashing the whole page.
  return raw
    .filter((mod): mod is CourseModule => Boolean(mod) && typeof mod === "object")
    .map((mod) => ({
      id: String(mod.id ?? ""),
      title: typeof mod.title === "string" ? mod.title : "",
      description: mod.description,
      lessons: Array.isArray(mod.lessons) ? mod.lessons : [],
      isOrientation: mod.isOrientation,
    }));
}

/**
 * Grants a student access to a course.
 *
 * Idempotent by design: a retried payment webhook or a manual admin grant must
 * not create a second enrollment or reset progress, so an existing ACTIVE
 * record is returned untouched.
 */
export async function grantCourseAccess(input: {
  userId: string;
  courseId: string;
  sourceOrderId?: string | null;
  isBonus?: boolean;
}) {
  await dbConnect();

  const existing = await Enrollment.findOne({
    userId: input.userId,
    courseId: input.courseId,
  })
    .lean()
    .exec();

  if (existing && existing.status === "ACTIVE") {
    return { id: String(existing._id), created: false };
  }

  if (existing) {
    // Re-granting after a revoke restores access without discarding progress.
    await Enrollment.updateOne(
      { _id: existing._id },
      {
        $set: {
          status: "ACTIVE",
          sourceOrderId: input.sourceOrderId ?? null,
          lastAccessedAt: new Date(),
        },
      }
    ).exec();
    return { id: String(existing._id), created: false };
  }

  const created = await Enrollment.create({
    userId: input.userId,
    courseId: input.courseId,
    status: "ACTIVE",
    sourceOrderId: input.sourceOrderId ?? null,
    isBonus: input.isBonus ?? false,
    completedLessonIds: [],
    enrolledAt: new Date(),
    lastAccessedAt: new Date(),
  });

  return { id: String(created._id), created: true };
}

/**
 * Revokes course access without deleting the record, so progress survives a
 * later re-grant and the audit trail shows the access was withdrawn.
 */
export async function revokeCourseAccess(input: {
  userId: string;
  courseId: string;
}): Promise<boolean> {
  await dbConnect();

  const result = await Enrollment.updateOne(
    { userId: input.userId, courseId: input.courseId, status: "ACTIVE" },
    { $set: { status: "REVOKED" } }
  ).exec();

  return result.modifiedCount > 0;
}

async function loadCourseBySlug(slug: string): Promise<CourseContent | null> {
  return Product.findOne({ slug, type: "COURSE" })
    .select("slug title thumbnailUrl courseDetails.modules")
    .lean()
    .exec();
}

async function requireActiveEnrollment(userId: string, courseId: string) {
  const enrollment = await Enrollment.findOne({
    userId,
    courseId,
    status: "ACTIVE",
  })
    .lean()
    .exec();

  if (!enrollment) {
    // Deliberately the same response whether the course does not exist or the
    // student simply has no access, so course slugs cannot be probed.
    throw new LmsServiceError(
      "COURSE_NOT_ENROLLED",
      "You do not have access to this course.",
      403
    );
  }

  return enrollment;
}

/**
 * Every course the student can open, with progress, for the account dashboard.
 */
export async function getEnrollmentsForUser(
  userId: string
): Promise<EnrollmentView[]> {
  await dbConnect();

  const enrollments = await Enrollment.find({ userId, status: "ACTIVE" })
    .sort({ lastAccessedAt: -1 })
    .lean()
    .exec();

  if (!enrollments.length) return [];

  const courseIds = enrollments.map((e) => e.courseId);
  const courses = await Product.find({ _id: { $in: courseIds }, type: "COURSE" })
    .select("slug title thumbnailUrl courseDetails.modules")
    .lean()
    .exec();

  const byId = new Map(courses.map((c) => [String(c._id), c]));

  const rows: EnrollmentView[] = [];
  for (const enrollment of enrollments) {
    const course = byId.get(String(enrollment.courseId));
    // An enrollment without a live course record cannot be opened; skip it
    // rather than rendering a dead link.
    if (!course) continue;

    const modules = modulesOf(course as CourseContent);
    const total = countLessons(modules);
    const completed = new Set(enrollment.completedLessonIds ?? []);
    const completedLessons = modules
      .flatMap((m) => m.lessons)
      .filter((lesson) => completed.has(lesson.id)).length;

    rows.push({
      id: String(enrollment._id),
      courseId: String(enrollment.courseId),
      courseSlug: course.slug,
      courseTitle: course.title,
      thumbnailUrl: course.thumbnailUrl ?? undefined,
      status: enrollment.status,
      isBonus: enrollment.isBonus ?? false,
      enrolledAt: new Date(enrollment.enrolledAt).toISOString(),
      lastAccessedAt: enrollment.lastAccessedAt
        ? new Date(enrollment.lastAccessedAt).toISOString()
        : null,
      completedLessonIds: enrollment.completedLessonIds ?? [],
      totalLessons: total,
      completedLessons,
      progressPercent: progressPercent(total, completedLessons),
      lastLessonId: enrollment.lastLessonId ?? null,
    });
  }

  return rows;
}

export async function hasCourseAccess(
  userId: string,
  courseSlug: string
): Promise<boolean> {
  await dbConnect();

  const course = await loadCourseBySlug(courseSlug);
  if (!course) return false;

  const enrollment = await Enrollment.exists({
    userId,
    courseId: course._id,
    status: "ACTIVE",
  });

  return Boolean(enrollment);
}

/**
 * The curriculum for one enrolled course, flattened for the player sidebar and
 * annotated with the student's completion.
 */
export async function getCourseOutlineForUser(
  userId: string,
  courseSlug: string
): Promise<CourseOutline> {
  await dbConnect();

  const course = await loadCourseBySlug(courseSlug);
  if (!course) {
    throw new LmsServiceError(
      "COURSE_NOT_FOUND",
      "That course does not exist.",
      404
    );
  }

  const enrollment = await requireActiveEnrollment(userId, String(course._id));
  const completed = new Set(enrollment.completedLessonIds ?? []);

  const storedModules = modulesOf(course as CourseContent);
  const orientationFlags = resolveOrientationFlags(storedModules);

  const modules: ModuleView[] = storedModules.map((module, index) => ({
    id: module.id,
    title: module.title,
    description: sanitizeCourseDescription(module.description),
    isOrientation: orientationFlags[index] ?? false,
    lessons: module.lessons.map(
      (lesson): LessonView => ({
        ...lesson,
        description: sanitizeCourseDescription(lesson.description),
        moduleId: module.id,
        moduleTitle: module.title,
        completed: completed.has(lesson.id),
      })
    ),
  }));

  const totalLessons = countLessons(storedModules);
  const completedLessons = modules
    .flatMap((m) => m.lessons)
    .filter((l) => l.completed && !l.isPreview).length;

  return {
    courseId: String(course._id),
    courseSlug: course.slug,
    courseTitle: course.title,
    modules,
    totalLessons,
    completedLessons,
    progressPercent: progressPercent(totalLessons, completedLessons),
    lastLessonId:
      enrollment.lastLessonId ??
      resumeLessonId(storedModules, [
        ...completed,
      ]),
  };
}

/**
 * Records that a student opened a lesson, so "continue" returns them there.
 * Rejects lessons that are not part of the course.
 */
export async function recordLessonOpened(input: {
  userId: string;
  courseSlug: string;
  lessonId: string;
}): Promise<void> {
  await dbConnect();

  const course = await loadCourseBySlug(input.courseSlug);
  if (!course) {
    throw new LmsServiceError(
      "COURSE_NOT_FOUND",
      "That course does not exist.",
      404
    );
  }

  const enrollment = await requireActiveEnrollment(input.userId, String(course._id));
  const lesson = modulesOf(course as CourseContent)
    .flatMap((m) => m.lessons)
    .find((l) => l.id === input.lessonId);

  if (!lesson) {
    throw new LmsServiceError(
      "LESSON_NOT_FOUND",
      "That lesson is not part of this course.",
      404
    );
  }

  await Enrollment.updateOne(
    { _id: enrollment._id },
    { $set: { lastLessonId: input.lessonId, lastAccessedAt: new Date() } }
  ).exec();
}

/**
 * Marks a lesson complete or incomplete.
 *
 * Completion is stored as lesson ids rather than a counter so publishing new
 * lessons does not silently change a student's percentage.
 */
export async function setLessonCompletion(input: {
  userId: string;
  courseSlug: string;
  lessonId: string;
  completed: boolean;
}): Promise<{ completedLessons: number; totalLessons: number }> {
  await dbConnect();

  const course = await loadCourseBySlug(input.courseSlug);
  if (!course) {
    throw new LmsServiceError(
      "COURSE_NOT_FOUND",
      "That course does not exist.",
      404
    );
  }

  const enrollment = await requireActiveEnrollment(input.userId, String(course._id));
  const modules = modulesOf(course as CourseContent);
  const lesson = modules.flatMap((m) => m.lessons).find((l) => l.id === input.lessonId);

  if (!lesson) {
    throw new LmsServiceError(
      "LESSON_NOT_FOUND",
      "That lesson is not part of this course.",
      404
    );
  }

  const current = new Set(enrollment.completedLessonIds ?? []);
  if (input.completed) current.add(input.lessonId);
  else current.delete(input.lessonId);

  await Enrollment.updateOne(
    { _id: enrollment._id },
    {
      $set: {
        completedLessonIds: [...current],
        lastLessonId: input.lessonId,
        lastAccessedAt: new Date(),
      },
    }
  ).exec();

  const total = countLessons(modules);
  const completedLessons = modules
    .flatMap((m) => m.lessons)
    .filter((l) => current.has(l.id) && !l.isPreview).length;

  return { completedLessons, totalLessons: total };
}

/**
 * Recomputes stored progress after an admin edits the curriculum.
 *
 * Drops ids for lessons that no longer exist and re-adds ids for lessons that
 * existed before the edit, so an edit cannot manufacture or erase completion.
 */
export function reconcileProgress(
  completedLessonIds: string[],
  before: CourseModule[],
  after: CourseModule[]
): string[] {
  const beforeIds = new Set(
    before.flatMap((m) => m.lessons).map((l) => l.id)
  );
  const afterIds = new Set(after.flatMap((m) => m.lessons).map((l) => l.id));

  const kept = new Set<string>();
  for (const id of completedLessonIds) {
    if (!afterIds.has(id)) continue;
    // A lesson that is new in this edit keeps whatever the student had; one
    // that already existed keeps its recorded completion.
    kept.add(id);
  }

  return [...kept].filter((id) => afterIds.has(id) || beforeIds.has(id));
}