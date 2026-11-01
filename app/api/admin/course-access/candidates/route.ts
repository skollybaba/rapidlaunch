import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { searchCourseAccessCandidates } from "@/lib/services/course-access-service";
import { courseAccessLookupSchema } from "@/lib/validation/course-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Account search for the "add student" picker in the course access tab. */
export async function GET(request: NextRequest) {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  try {
    const parsed = courseAccessLookupSchema.parse({
      courseId: request.nextUrl.searchParams.get("courseId") ?? "",
      q: request.nextUrl.searchParams.get("q") ?? undefined,
    });
    const candidates = await searchCourseAccessCandidates(parsed);
    return apiOk({ candidates });
  } catch (caught) {
    return handleApiError(caught, requestId);
  }
}
