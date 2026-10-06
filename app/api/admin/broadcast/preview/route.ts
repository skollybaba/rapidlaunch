import type { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { renderBroadcastEmail } from "@/lib/services/broadcast-service";

export const runtime = "nodejs";

/** Renders the composed email in the brand shell, for the preview dialog. */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  let payload: { title?: unknown; bodyHtml?: unknown };
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Invalid preview request.", requestId);
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const subject =
    typeof payload.subject === "string" ? payload.subject.trim() : "";
  const bodyHtml = typeof payload.bodyHtml === "string" ? payload.bodyHtml : "";
  if (!title || !bodyHtml.trim()) {
    return apiError(
      400,
      "EMPTY_PREVIEW",
      "Add a title and body before previewing.",
      requestId
    );
  }

  try {
    const rendered = await renderBroadcastEmail({ title, bodyHtml, subject });
    return apiOk(rendered);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
