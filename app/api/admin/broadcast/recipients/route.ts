import type { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { countRecipientsForSegment } from "@/lib/services/broadcast-service";
import { z } from "zod";

const schema = z.object({
  segmentType: z.enum([
    "ALL_USERS",
    "COURSE_ENROLLEES",
    "SESSION_REGISTRANTS",
    "PENDING_ORDERS",
  ]),
  productId: z.string().trim().min(1).optional(),
});

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return apiError(
      400,
      "INVALID_PARAMS",
      parsed.error.issues[0]?.message ?? "Invalid parameters.",
      requestId
    );
  }

  try {
    const count = await countRecipientsForSegment(
      parsed.data.segmentType,
      parsed.data.productId
    );
    return apiOk({ count });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
