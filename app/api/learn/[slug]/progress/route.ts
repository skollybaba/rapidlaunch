import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { setLessonCompletion } from "@/lib/services/lms-service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const requestId = newRequestId();
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue.", requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Invalid JSON", requestId);
  }

  if (typeof body !== "object" || body === null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid request body.", requestId);
  }

  const { lessonId, completed } = body as {
    lessonId?: unknown;
    completed?: unknown;
  };

  if (typeof lessonId !== "string" || !lessonId) {
    return apiError(400, "VALIDATION_ERROR", "lessonId is required.", requestId);
  }
  if (typeof completed !== "boolean") {
    return apiError(400, "VALIDATION_ERROR", "completed must be a boolean.", requestId);
  }

  try {
    const result = await setLessonCompletion({
      userId: String(user._id),
      courseSlug: slug,
      lessonId,
      completed,
    });
    return apiOk(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
