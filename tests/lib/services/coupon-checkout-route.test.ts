import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getCouponPreview: getCouponPreviewMock,
  CouponServiceError,
} = vi.hoisted(() => ({
  getCouponPreview: vi.fn(),
  CouponServiceError: class CouponServiceError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status = 400) {
      super(message);
      this.name = "CouponServiceError";
      this.code = code;
      this.status = status;
    }
  },
}));

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Product", () => ({
  Product: { findOne: vi.fn() },
}));

vi.mock("@/lib/services/coupon-service", () => ({
  getCouponPreview: getCouponPreviewMock,
  CouponServiceError,
}));

import { Product } from "@/models/Product";
import { POST } from "@/app/api/checkout/coupon/route";

function productChain() {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue({
      _id: "PROD1",
      type: "COURSE",
      priceMinor: 5_000_000,
      currency: "NGN",
    }),
  } as never;
}

function previewRequest(body: unknown) {
  return new NextRequest("http://localhost/api/checkout/coupon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Product.findOne).mockReturnValue(productChain());
  getCouponPreviewMock.mockResolvedValue({
    code: "LAUNCH50",
    discountPercent: 10,
    appliesTo: "COURSE",
    discountMinor: 500_000,
    subtotalMinor: 5_000_000,
    totalMinor: 4_500_000,
  });
});

describe("POST /api/checkout/coupon", () => {
  it("returns a discounted preview for a valid code", async () => {
    const response = await POST(
      previewRequest({ couponCode: "launch50", productId: "PROD1" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Product.findOne).toHaveBeenCalledWith({
      _id: "PROD1",
      status: "PUBLISHED",
    });
    expect(getCouponPreviewMock).toHaveBeenCalledWith(
      "LAUNCH50",
      "COURSE",
      5_000_000
    );
    expect(body.data.coupon).toMatchObject({
      code: "LAUNCH50",
      discountMinor: 500_000,
      totalMinor: 4_500_000,
      currency: "NGN",
    });
  });

  it("fails for a missing or unpublished product", async () => {
    vi.mocked(Product.findOne).mockImplementation(
      () =>
        ({
          select: vi.fn().mockReturnThis(),
          lean: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue(null),
        }) as never
    );
    const response = await POST(
      previewRequest({ couponCode: "LAUNCH50", productId: "NOPE" })
    );
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("COUPON_PRODUCT_NOT_AVAILABLE");
  });

  it("surfaces coupon service errors safely", async () => {
    getCouponPreviewMock.mockRejectedValue(
      new CouponServiceError("COUPON_INACTIVE", "This discount code is not currently active.", 400)
    );
    const response = await POST(
      previewRequest({ couponCode: "LAUNCH50", productId: "PROD1" })
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("COUPON_INACTIVE");
    expect(body.ok).toBe(false);
  });

  it("rejects an invalid payload", async () => {
    const response = await POST(
      previewRequest({ couponCode: "" })
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(getCouponPreviewMock).not.toHaveBeenCalled();
  });
});