import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { couponPreviewSchema } from "@/lib/validation/coupon";
import {
  CouponServiceError,
  getCouponPreview,
} from "@/lib/services/coupon-service";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = newRequestId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Invalid JSON", requestId);
  }

  try {
    const parsed = couponPreviewSchema.parse(body);

    await dbConnect();
    const product = await Product.findOne({ _id: parsed.productId, status: "PUBLISHED" })
      .select("_id type priceMinor currency")
      .lean()
      .exec();
    if (!product) {
      throw new CouponServiceError("COUPON_PRODUCT_NOT_AVAILABLE", "This product is not available.", 404);
    }

    const preview = await getCouponPreview(
      parsed.couponCode,
      product.type,
      product.priceMinor
    );

    return apiOk({
      coupon: {
        ...preview,
        currency: product.currency,
      },
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}