import { apiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { RECIPIENTS_CSV_TEMPLATE } from "@/lib/validation/recipients";

export const runtime = "nodejs";

/** Downloadable import template: `name,email` with sample rows. */
export async function GET() {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  return new Response(RECIPIENTS_CSV_TEMPLATE, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rapid-launch-recipients-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
