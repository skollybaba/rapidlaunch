import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { recordLessonOpened } from "@/lib/services/lms-service";

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

  const lessonId =
    typeof body === "object" && body !== null && "lessonId" in body
      ? String((body as { lessonId: unknown }).lessonId)
      : "";

  if (!lessonId) {
    return apiError(400, "VALIDATION_ERROR", "lessonId is required.", requestId);
  }

  try {
    await recordLessonOpened({
      userId: String(user._id),
      courseSlug: slug,
      lessonId,
    });
    return apiOk({ recorded: true });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
