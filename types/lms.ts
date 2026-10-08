/**
 * Learning management system primitives.
 *
 * A course owns an ordered list of modules, and each module owns an ordered
 * list of lessons. A lesson is one of three kinds, and any lesson stands on its
 * own:
 *
 * - VIDEO     an embedded YouTube video
 * - DOCUMENT  an uploaded file served from object storage
 * - LINK      an outbound resource hosted elsewhere
 *
 * Module and lesson ids are authored by the admin builder and are the stable
 * key progress is recorded against, so reordering or renaming content never
 * resets a student's progress.
 */

export const LESSON_TYPES = ["VIDEO", "DOCUMENT", "LINK"] as const;

export type LessonType = (typeof LESSON_TYPES)[number];

export interface CourseLesson {
  id: string;
  title: string;
  type: LessonType;
  description?: string;
  /** VIDEO only. A YouTube watch, short, shorts or embed URL. */
  youtubeUrl?: string;
  /** DOCUMENT only. Public URL of the stored object. */
  documentUrl?: string;
  documentFileName?: string;
  documentSizeBytes?: number;
  documentContentType?: string;
  /** LINK only. */
  linkUrl?: string;
  durationMinutes?: number;
  /** Lets the admin mark a lesson visible before the course is released. */
  isPreview?: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  lessons: CourseLesson[];
  /**
   * Marks the opening module as orientation. Only the first module can hold
   * it. `undefined` means "never decided" and resolves to `true` for module 1,
   * so existing courses become orientation-aware without a data migration.
   */
  isOrientation?: boolean;
}

export const ENROLLMENT_STATUSES = ["ACTIVE", "REVOKED"] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface EnrollmentDoc {
  _id: unknown;
  userId: unknown;
  courseId: unknown;
  status: EnrollmentStatus;
  sourceOrderId?: unknown;
  isBonus: boolean;
  /** Lesson ids the student has marked complete. */
  completedLessonIds: string[];
  /** Where to resume, so "continue" returns to the last opened lesson. */
  lastLessonId?: string | null;
  enrolledAt: Date;
  lastAccessedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EnrollmentView {
  id: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  thumbnailUrl?: string;
  status: EnrollmentStatus;
  isBonus: boolean;
  enrolledAt: string;
  lastAccessedAt: string | null;
  completedLessonIds: string[];
  totalLessons: number;
  completedLessons: number;
  /** Integer percentage of lessons completed, 0-100. */
  progressPercent: number;
  lastLessonId: string | null;
}

export interface LessonView extends CourseLesson {
  moduleId: string;
  moduleTitle: string;
  completed: boolean;
}

export interface ModuleView {
  /** Resolved server-side: true only for the first module of the course. */
  isOrientation: boolean;
  id: string;
  title: string;
  description?: string;
  lessons: LessonView[];
}

/**
 * Optional "Before you start" sell page authored by the admin. When enabled it
 * is the first screen a new student sees in the player, before any lesson, and
 * is hidden as soon as the student starts engaging with the curriculum.
 *
 * The video is rendered through the same non-downloadable `YouTubePlayer`
 * embed used by video lessons; the body is trusted HTML sanitized on the
 * server; `ctaLabel`/`ctaUrl` let the admin send the student somewhere (an
 * external link or a root-relative route). The player renders its own
 * "Begin course" button beside them.
 */
export interface BeforeYouStartContent {
  enabled: boolean;
  title?: string;
  youtubeUrl?: string;
  contentHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface CourseOutline {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  modules: ModuleView[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  lastLessonId: string | null;
  /**
   * True once the student has engaged with the curriculum (opened a lesson or
   * completed one). Distinct from `lastLessonId`, which is always resolved to
   * a resume target even for a brand-new student — so the before-you-start
   * gate keys off this flag instead.
   */
  hasStarted: boolean;
  /** Present only when the admin enabled a before-you-start page for this course. */
  beforeYouStart?: BeforeYouStartContent;
}

/**
 * Counts lessons across a course outline.
 *
 * Preview lessons are excluded: they are marketing surface for an unenrolled
 * visitor and should never make a paid student look incomplete.
 */
export function countLessons(modules: CourseModule[]): number {
  return modules.reduce(
    (total, module) =>
      total + module.lessons.filter((lesson) => !lesson.isPreview).length,
    0
  );
}

/**
 * Resolves the orientation flag for every module.
 *
 * Orientation is positional: only the first module may be the orientation
 * module, and it is orientation unless an admin explicitly turned it off.
 * Every other module is always a course module, whatever the stored value says.
 * That keeps a stale or hand-edited `true` on a later module from splitting the
 * course in two.
 */
export function resolveOrientationFlags(
  modules: Pick<CourseModule, "isOrientation">[]
): boolean[] {
  return modules.map(
    (module, index) => index === 0 && module.isOrientation !== false
  );
}

/**
 * Human label per module position.
 *
 * The orientation module is called "Orientation" and never consumes a course
 * module number, so course modules are numbered from 1 whether or not
 * orientation is switched on.
 */
export function moduleLabelsFor(isOrientationFlags: boolean[]): string[] {
  let courseNumber = 0;
  return isOrientationFlags.map((isOrientation) =>
    isOrientation ? "Orientation" : `Module ${++courseNumber}`
  );
}

/** Convenience wrapper that resolves the stored flags first. */
export function moduleLabels(
  modules: Pick<CourseModule, "isOrientation">[]
): string[] {
  return moduleLabelsFor(resolveOrientationFlags(modules));
}

/**
 * Returns the lessons a student may complete, flattened in curriculum order.
 */
export function playableLessons(modules: CourseModule[]): CourseLesson[] {
  return modules.flatMap((module) =>
    module.lessons.filter((lesson) => !lesson.isPreview)
  );
}

/**
 * Picks the lesson a student should resume on: their last opened lesson when it
 * still exists, otherwise the first incomplete lesson, otherwise the first
 * lesson in the course.
 */
export function resumeLessonId(
  modules: CourseModule[],
  completedLessonIds: string[],
  lastLessonId?: string | null
): string | null {
  const lessons = playableLessons(modules);
  if (!lessons.length) return null;

  if (lastLessonId) {
    const match = lessons.find((lesson) => lesson.id === lastLessonId);
    if (match) return match.id;
  }

  const completed = new Set(completedLessonIds);
  return (lessons.find((lesson) => !completed.has(lesson.id)) ?? lessons[0]).id;
}

/**
 * The lesson "Begin course" opens after the before-you-start page: the first
 * playable lesson of the first module. Orientation is positional, so when a
 * course has an orientation module it is the first module and when it does not
 * the first module is course module 1 — neither case needs special-casing.
 */
export function courseEntryLessonId(
  modules: Pick<CourseModule, "lessons">[]
): string | null {
  const firstModule = modules[0];
  if (!firstModule) return null;
  const first = firstModule.lessons.find((lesson) => !lesson.isPreview);
  return first?.id ?? null;
}

/**
 * Integer completion percentage, clamped to 0-100.
 */
export function progressPercent(
  totalLessons: number,
  completedLessons: number
): number {
  if (totalLessons <= 0) return 0;
  const raw = Math.round((completedLessons / totalLessons) * 100);
  return Math.min(100, Math.max(0, raw));
}