import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { createCourse } from "@/lib/services/admin-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin") return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Invalid JSON", requestId);
  }

  try {
    const course = await createCourse(body);
    return apiOk({ id: String(course._id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
