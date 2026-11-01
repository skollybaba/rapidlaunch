import "server-only";

import { isValidObjectId } from "mongoose";

import dbConnect from "@/lib/db";
import { env } from "@/lib/env";
import { Enrollment } from "@/models/Enrollment";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { createMailAdapter } from "@/lib/providers/mail";
import { grantCourseAccess } from "@/lib/services/lms-service";
import type {
  CourseAccessCandidate,
  CourseAccessRow,
  GrantCourseAccessResult,
} from "@/types/course-access";
import {
  normalizeAccessSource,
} from "@/types/lms";

export class CourseAccessServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "CourseAccessServiceError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Complimentary access handed out by an admin.
 *
 * These grants create a real Enrollment record so the student can open the
 * course from their account, but they carry `accessSource: "ADMIN_GRANT"`, no
 * order and no fulfillment. Analytics queries exclude that source, so granted
 * seats never show up as sales, enrolments or learner activity.
 */

function requireObjectId(value: string, code: string, message: string) {
  if (!isValidObjectId(value)) {
    throw new CourseAccessServiceError(code, message, 404);
  }
}

/**
 * Everyone with active access to a course, paid and complimentary, for the
 * course editor's access tab. One query per collection, not per student.
 */
export async function listCourseAccess(
  courseId: string
): Promise<CourseAccessRow[]> {
  requireObjectId(courseId, "COURSE_NOT_FOUND", "That course does not exist.");
  await dbConnect();

  const enrollments = await Enrollment.find({ courseId, status: "ACTIVE" })
    .sort({ enrolledAt: -1 })
    .lean()
    .exec();

  if (!enrollments.length) return [];

  const userIds = enrollments
    .map((enrollment) => enrollment.userId)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));
  const grantedByIds = enrollments
    .map((enrollment) => enrollment.grantedBy)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  const users = await User.find({
    _id: { $in: [...userIds, ...grantedByIds] },
  })
    .select("_id email name")
    .lean()
    .exec();

  const byId = new Map(users.map((user) => [String(user._id), user]));

  return enrollments.map((enrollment) => {
    const user = byId.get(String(enrollment.userId));
    const grantedBy = enrollment.grantedBy
      ? byId.get(String(enrollment.grantedBy))
      : undefined;

    return {
      enrollmentId: String(enrollment._id),
      userId: String(enrollment.userId),
      // A deleted account keeps its enrollment row; show that instead of a
      // blank cell so the admin understands why the student cannot sign in.
      email: user?.email ?? "Deleted account",
      name: user?.name,
      accessSource: normalizeAccessSource(
        enrollment.accessSource,
        enrollment.isBonus
      ),
      enrolledAt: new Date(enrollment.enrolledAt).toISOString(),
      lastAccessedAt: enrollment.lastAccessedAt
        ? new Date(enrollment.lastAccessedAt).toISOString()
        : null,
      grantedByEmail: grantedBy?.email,
      grantNote: enrollment.grantNote ?? null,
    };
  });
}

/**
 * Type-ahead for the "add student" picker. Returns a short list of accounts,
 * each flagged with whether they already have access.
 */
export async function searchCourseAccessCandidates(input: {
  courseId: string;
  query?: string;
}): Promise<CourseAccessCandidate[]> {
  requireObjectId(
    input.courseId,
    "COURSE_NOT_FOUND",
    "That course does not exist."
  );
  await dbConnect();

  const course = await Product.exists({
    _id: input.courseId,
    type: "COURSE",
  });
  if (!course) {
    throw new CourseAccessServiceError(
      "COURSE_NOT_FOUND",
      "That course does not exist.",
      404
    );
  }

  const trimmed = (input.query ?? "").trim();
  const filter: Record<string, unknown> = {};
  if (trimmed) {
    filter.$or = [
      { email: { $regex: trimmed, $options: "i" } },
      { name: { $regex: trimmed, $options: "i" } },
    ];
  }

  const [users, activeEnrollments] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .limit(8)
      .select("_id email name")
      .lean()
      .exec(),
    Enrollment.find({ courseId: input.courseId, status: "ACTIVE" })
      .select("userId")
      .lean()
      .exec(),
  ]);

  const enrolled = new Set(
    activeEnrollments.map((enrollment) => String(enrollment.userId))
  );

  return users.map((user) => ({
    id: String(user._id),
    email: user.email,
    name: user.name,
    hasAccess: enrolled.has(String(user._id)),
  }));
}

/**
 * Gives one account complimentary access to a course.
 *
 * No order, payment or fulfillment is created. The student gets the standard
 * "you're enrolled" email so they know the course is available, and the record
 * is tagged `ADMIN_GRANT` so analytics can ignore it.
 */
export async function grantAdminCourseAccess(input: {
  courseId: string;
  userId: string;
  /** Admin performing the grant; stored for the audit trail. */
  grantedBy: string;
  note?: string | null;
}): Promise<GrantCourseAccessResult> {
  requireObjectId(
    input.courseId,
    "COURSE_NOT_FOUND",
    "That course does not exist."
  );
  requireObjectId(
    input.userId,
    "USER_NOT_FOUND",
    "That account does not exist."
  );
  await dbConnect();

  const [course, user] = await Promise.all([
    Product.findOne({ _id: input.courseId, type: "COURSE" })
      .select("slug title")
      .lean()
      .exec(),
    User.findById(input.userId).select("email name").lean().exec(),
  ]);

  if (!course) {
    throw new CourseAccessServiceError(
      "COURSE_NOT_FOUND",
      "That course does not exist.",
      404
    );
  }
  if (!user) {
    throw new CourseAccessServiceError(
      "USER_NOT_FOUND",
      "That account does not exist.",
      404
    );
  }
  if (!user.email) {
    throw new CourseAccessServiceError(
      "USER_WITHOUT_EMAIL",
      "That account has no email address, so access cannot be delivered.",
      400
    );
  }

  const alreadyHadAccess = Boolean(
    await Enrollment.exists({
      userId: input.userId,
      courseId: input.courseId,
      status: "ACTIVE",
    })
  );

  const note = input.note?.trim();
  const result = await grantCourseAccess({
    userId: input.userId,
    courseId: input.courseId,
    accessSource: "ADMIN_GRANT",
    grantedBy: input.grantedBy,
    grantNote: note ? note.slice(0, 280) : null,
  });

  // A student who already had access keeps it; don't send a second welcome
  // email for a seat that already existed.
  let emailSent = false;
  if (!alreadyHadAccess) {
    emailSent = await sendGrantNotification({
      to: user.email,
      courseTitle: course.title,
      courseSlug: course.slug,
    });
  }

  return {
    enrollmentId: result.id,
    created: result.created,
    alreadyHadAccess,
    emailSent,
    user: { id: String(user._id), email: user.email, name: user.name },
  };
}

async function sendGrantNotification(input: {
  to: string;
  courseTitle: string;
  courseSlug: string;
}): Promise<boolean> {
  try {
    const adapter = createMailAdapter();
    await adapter.sendTemplateEmail({
      templateKey: "course_access_fulfilled",
      to: input.to,
      variables: {
        itemTitle: input.courseTitle,
        courseTitle: input.courseTitle,
        courseUrl: `${env.NEXT_PUBLIC_APP_URL}/learn/${input.courseSlug}`,
        customerEmail: input.to,
        appUrl: env.NEXT_PUBLIC_APP_URL,
      },
    });
    return true;
  } catch (error) {
    // Access is already granted; a mail failure must not undo it.
    console.error("Complimentary course access email failed", input.to, {
      error,
    });
    return false;
  }
}

/**
 * Removes complimentary access only. A purchase or bundle grant is left alone
 * so an admin can never accidentally revoke paid access from this screen.
 */
export async function revokeAdminCourseAccess(input: {
  courseId: string;
  userId: string;
}): Promise<boolean> {
  requireObjectId(
    input.courseId,
    "COURSE_NOT_FOUND",
    "That course does not exist."
  );
  requireObjectId(
    input.userId,
    "USER_NOT_FOUND",
    "That account does not exist."
  );
  await dbConnect();

  const result = await Enrollment.updateOne(
    {
      courseId: input.courseId,
      userId: input.userId,
      status: "ACTIVE",
      accessSource: "ADMIN_GRANT",
    },
    { $set: { status: "REVOKED" } }
  ).exec();

  if (result.modifiedCount > 0) return true;

  const active = await Enrollment.exists({
    courseId: input.courseId,
    userId: input.userId,
    status: "ACTIVE",
  });
  if (active) {
    throw new CourseAccessServiceError(
      "NOT_COMPLIMENTARY",
      "This student's access came from a purchase and cannot be removed here.",
      409
    );
  }

  throw new CourseAccessServiceError(
    "NOT_ENROLLED",
    "That student does not have access to this course.",
    404
  );
}
