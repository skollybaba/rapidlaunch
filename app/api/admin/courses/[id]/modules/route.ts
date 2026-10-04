import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getCourseModules,
  setCourseModules,
} from "@/lib/services/admin-service";

export const runtime = "nodejs";

async function requireAdmin(requestId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId),
    } as const;
  }
  if (user.role !== "admin") {
    return {
      error: apiError(403, "FORBIDDEN", "Admins only.", requestId),
    } as const;
  }
  return { user } as const;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const auth = await requireAdmin(requestId);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const modules = await getCourseModules(id);
    return apiOk({ modules });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const auth = await requireAdmin(requestId);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Invalid JSON", requestId);
  }

  const modules =
    typeof body === "object" && body !== null && "modules" in body
      ? (body as { modules: unknown }).modules
      : undefined;

  if (!Array.isArray(modules)) {
    return apiError(400, "VALIDATION_ERROR", "modules must be an array.", requestId);
  }

  try {
    const result = await setCourseModules(id, modules);
    return apiOk(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
