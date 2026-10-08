import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { COUPON_STATUSES, type CouponStatus } from "@/types/coupon";
import {
  createCoupon,
  getAdminCoupons,
  type AdminCouponQuery,
} from "@/lib/services/coupon-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin") return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  try {
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get("status") ?? "";
    const query: AdminCouponQuery = {
      q: searchParams.get("q") ?? "",
      status: (COUPON_STATUSES as readonly string[]).includes(rawStatus)
        ? (rawStatus as CouponStatus)
        : undefined,
    };
    const coupons = await getAdminCoupons(query);
    return apiOk({ coupons });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

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
    const coupon = await createCoupon(body);
    return apiOk({ id: String(coupon._id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}