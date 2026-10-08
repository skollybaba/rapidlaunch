import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getCurrentUser: getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const {
  getAdminCoupons: getAdminCouponsMock,
  createCoupon: createCouponMock,
  setCouponActive: setCouponActiveMock,
  updateCoupon: updateCouponMock,
  deleteCoupon: deleteCouponMock,
  CouponServiceError,
} = vi.hoisted(() => ({
  getAdminCoupons: vi.fn(),
  createCoupon: vi.fn(),
  setCouponActive: vi.fn(),
  updateCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
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

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));

vi.mock("@/lib/services/coupon-service", () => ({
  getAdminCoupons: getAdminCouponsMock,
  createCoupon: createCouponMock,
  setCouponActive: setCouponActiveMock,
  updateCoupon: updateCouponMock,
  deleteCoupon: deleteCouponMock,
  CouponServiceError,
}));

import { GET, POST } from "@/app/api/admin/coupons/route";
import { DELETE, PATCH } from "@/app/api/admin/coupons/[id]/route";

const adminUser = { _id: "ADMIN1", role: "admin" };
const customerUser = { _id: "CUST1", role: "customer" };

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue(adminUser);
});

describe("GET /api/admin/coupons", () => {
  it("requires an admin", async () => {
    getCurrentUserMock.mockResolvedValueOnce(customerUser);
    const response = await GET(new NextRequest("http://localhost/api/admin/coupons"));
    expect(response.status).toBe(403);
    expect(getAdminCouponsMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const response = await GET(new NextRequest("http://localhost/api/admin/coupons"));
    expect(response.status).toBe(401);
  });

  it("lists coupons and passes the status query", async () => {
    getAdminCouponsMock.mockResolvedValue([{ id: "CPN1", code: "LAUNCH50" }]);
    const response = await GET(
      new NextRequest("http://localhost/api/admin/coupons?status=ACTIVE")
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(getAdminCouponsMock).toHaveBeenCalledWith({
      q: "",
      status: "ACTIVE",
    });
  });
});

describe("POST /api/admin/coupons", () => {
  it("creates a coupon with an admin token", async () => {
    createCouponMock.mockResolvedValue({ _id: "CPN1" });
    const response = await POST(
      jsonRequest("http://localhost/api/admin/coupons", "POST", {
        code: "LAUNCH50",
        discountPercent: 50,
      })
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, data: { id: "CPN1" } });
    expect(createCouponMock).toHaveBeenCalledWith({
      code: "LAUNCH50",
      discountPercent: 50,
    });
  });

  it("rejects non-admin users", async () => {
    getCurrentUserMock.mockResolvedValueOnce(customerUser);
    const response = await POST(
      jsonRequest("http://localhost/api/admin/coupons", "POST", {})
    );
    expect(response.status).toBe(403);
    expect(createCouponMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/coupons/[id]", () => {
  it("toggles the coupon on with a bare active payload", async () => {
    setCouponActiveMock.mockResolvedValue(undefined);
    const response = await PATCH(
      jsonRequest("http://localhost/api/admin/coupons/CPN1", "PATCH", {
        active: true,
      }),
      { params: Promise.resolve({ id: "CPN1" }) }
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, data: { id: "CPN1", active: true } });
    expect(setCouponActiveMock).toHaveBeenCalledWith("CPN1", true);
    expect(updateCouponMock).not.toHaveBeenCalled();
  });

  it("updates a full coupon payload", async () => {
    updateCouponMock.mockResolvedValue({ _id: "CPN1" });
    const response = await PATCH(
      jsonRequest("http://localhost/api/admin/coupons/CPN1", "PATCH", {
        code: "LAUNCH25",
        discountPercent: 25,
      }),
      { params: Promise.resolve({ id: "CPN1" }) }
    );
    expect(response.status).toBe(200);
    expect(updateCouponMock).toHaveBeenCalledWith("CPN1", {
      code: "LAUNCH25",
      discountPercent: 25,
    });
    expect(setCouponActiveMock).not.toHaveBeenCalled();
  });

  it("maps service errors to API responses", async () => {
    updateCouponMock.mockRejectedValue(
      new CouponServiceError("COUPON_NOT_FOUND", "Coupon not found.", 404)
    );
    const response = await PATCH(
      jsonRequest("http://localhost/api/admin/coupons/NOPE", "PATCH", {
        code: "LAUNCH50",
        discountPercent: 10,
      }),
      { params: Promise.resolve({ id: "NOPE" }) }
    );
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("COUPON_NOT_FOUND");
  });
});

describe("DELETE /api/admin/coupons/[id]", () => {
  it("deletes a coupon as an admin", async () => {
    deleteCouponMock.mockResolvedValue(undefined);
    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/coupons/CPN1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "CPN1" }) }
    );
    expect(response.status).toBe(200);
    expect(deleteCouponMock).toHaveBeenCalledWith("CPN1");
  });

  it("rejects non-admins", async () => {
    getCurrentUserMock.mockResolvedValueOnce(customerUser);
    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/coupons/CPN1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "CPN1" }) }
    );
    expect(response.status).toBe(403);
    expect(deleteCouponMock).not.toHaveBeenCalled();
  });
});