import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { updateAdminUserRole } from "@/lib/services/admin-service";
import { updateUserRoleSchema } from "@/lib/validation/user";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const requestId = newRequestId();
  const { userId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.", requestId);
  }

  try {
    const parsed = updateUserRoleSchema.parse(body);
    const updated = await updateAdminUserRole(
      userId,
      parsed.role,
      String(user._id)
    );
    return apiOk({ user: updated });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
