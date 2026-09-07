import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getCourseBundleChoices } from "@/lib/services/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  try {
    const choices = await getCourseBundleChoices();
    return apiOk({ choices });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}