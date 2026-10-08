import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { couponToggleSchema } from "@/lib/validation/coupon";
import {
  deleteCoupon,
  setCouponActive,
  updateCoupon,
} from "@/lib/services/coupon-service";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;
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
    const isToggle =
      isRecord(body) &&
      Object.keys(body).length === 1 &&
      typeof body.active === "boolean";

    if (isToggle) {
      const parsed = couponToggleSchema.parse(body);
      await setCouponActive(id, parsed.active);
      return apiOk({ id, active: parsed.active });
    }

    const updated = await updateCoupon(id, body);
    return apiOk({ id: String(updated._id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin") return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  try {
    await deleteCoupon(id);
    return apiOk({ ok: true });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}