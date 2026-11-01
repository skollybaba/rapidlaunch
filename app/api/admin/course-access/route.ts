import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import {
  grantAdminCourseAccess,
  listCourseAccess,
  revokeAdminCourseAccess,
} from "@/lib/services/course-access-service";
import {
  courseAccessLookupSchema,
  grantCourseAccessSchema,
  revokeCourseAccessSchema,
} from "@/lib/validation/course-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: "unauthenticated" as const };
  if (user.role !== "admin") return { user: null, error: "forbidden" as const };
  return { user, error: null };
}

/** Everyone with active access to a course. */
export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  const { user, error } = await requireAdminUser();
  if (!user) {
    return error === "unauthenticated"
      ? apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId)
      : apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  try {
    const parsed = courseAccessLookupSchema.parse({
      courseId: request.nextUrl.searchParams.get("courseId") ?? "",
      q: request.nextUrl.searchParams.get("q") ?? undefined,
    });
    const rows = await listCourseAccess(parsed.courseId);
    return apiOk({ rows });
  } catch (caught) {
    return handleApiError(caught, requestId);
  }
}

/** Grants complimentary access and notifies the student. */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const { user, error } = await requireAdminUser();
  if (!user) {
    return error === "unauthenticated"
      ? apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId)
      : apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(
      400,
      "INVALID_JSON",
      "Request body must be valid JSON.",
      requestId
    );
  }

  try {
    const parsed = grantCourseAccessSchema.parse(body);
    const result = await grantAdminCourseAccess({
      courseId: parsed.courseId,
      userId: parsed.userId,
      grantedBy: String(user._id),
      note: parsed.note ?? null,
    });
    return apiOk(result);
  } catch (caught) {
    return handleApiError(caught, requestId);
  }
}

/** Revokes complimentary access. Purchased access is never touched. */
export async function DELETE(request: NextRequest) {
  const requestId = newRequestId();
  const { user, error } = await requireAdminUser();
  if (!user) {
    return error === "unauthenticated"
      ? apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId)
      : apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  try {
    const parsed = revokeCourseAccessSchema.parse({
      courseId: request.nextUrl.searchParams.get("courseId") ?? "",
      userId: request.nextUrl.searchParams.get("userId") ?? "",
    });
    await revokeAdminCourseAccess(parsed);
    return apiOk({ revoked: true });
  } catch (caught) {
    return handleApiError(caught, requestId);
  }
}
