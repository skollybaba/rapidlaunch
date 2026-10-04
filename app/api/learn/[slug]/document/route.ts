import { NextRequest } from "next/server";

import { apiError, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getCourseOutlineForUser } from "@/lib/services/lms-service";

export const runtime = "nodejs";

function inlineContentType(
  declared: string | undefined,
  responseType: string | null,
  fileName: string
): string {
  const candidates = [declared, responseType, fileName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (candidates.includes("pdf")) return "application/pdf";
  if (declared && declared.includes("/")) return declared;
  if (responseType && responseType !== "application/octet-stream") {
    return responseType;
  }
  return "application/octet-stream";
}

function contentDisposition(fileName: string): string {
  const safe = fileName.replace(/["\\\r\n]/g, "").trim() || "document";
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(
    safe
  )}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const requestId = newRequestId();
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "Please sign in to continue.", requestId);
  }

  const lessonId = request.nextUrl.searchParams.get("lessonId") ?? "";
  if (!lessonId) {
    return apiError(400, "VALIDATION_ERROR", "lessonId is required.", requestId);
  }

  try {
    const outline = await getCourseOutlineForUser(String(user._id), slug);
    const lesson = outline.modules
      .flatMap((module) => module.lessons)
      .find((item) => item.id === lessonId);

    if (!lesson || lesson.type !== "DOCUMENT" || !lesson.documentUrl) {
      return apiError(
        404,
        "DOCUMENT_NOT_FOUND",
        "That document is unavailable.",
        requestId
      );
    }

    const upstream = await fetch(lesson.documentUrl);
    if (!upstream.ok || !upstream.body) {
      return apiError(
        502,
        "DOCUMENT_UNAVAILABLE",
        "That document could not be loaded. Please try again.",
        requestId
      );
    }

    const fileName = lesson.documentFileName || "document";
    const headers = new Headers({
      "Content-Type": inlineContentType(
        lesson.documentContentType,
        upstream.headers.get("content-type"),
        fileName
      ),
      "Content-Disposition": contentDisposition(fileName),
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    });
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
