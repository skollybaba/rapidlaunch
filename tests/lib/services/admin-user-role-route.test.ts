import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getCurrentUser: getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const {
  updateAdminUserRole: updateAdminUserRoleMock,
  AdminServiceError,
} = vi.hoisted(() => ({
  updateAdminUserRole: vi.fn(),
  AdminServiceError: class AdminServiceError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status = 400) {
      super(message);
      this.name = "AdminServiceError";
      this.code = code;
      this.status = status;
    }
  },
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));

vi.mock("@/lib/services/admin-service", () => ({
  updateAdminUserRole: updateAdminUserRoleMock,
  AdminServiceError,
}));

import { PATCH } from "@/app/api/admin/users/[userId]/route";

const adminUser = { _id: "ADMIN1", role: "admin" };
const customerUser = { _id: "CUST1", role: "customer" };

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/users/USER1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ userId: "USER1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue(adminUser);
  updateAdminUserRoleMock.mockResolvedValue({ id: "USER1", role: "admin" });
});

describe("PATCH /api/admin/users/[userId]", () => {
  it("requires a signed-in user", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const response = await PATCH(patchRequest({ role: "admin" }), params);

    expect(response.status).toBe(401);
    expect(updateAdminUserRoleMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    getCurrentUserMock.mockResolvedValueOnce(customerUser);
    const response = await PATCH(patchRequest({ role: "admin" }), params);

    expect(response.status).toBe(403);
    expect(updateAdminUserRoleMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid role", async () => {
    const response = await PATCH(patchRequest({ role: "owner" }), params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(updateAdminUserRoleMock).not.toHaveBeenCalled();
  });

  it("updates the role for an admin", async () => {
    const response = await PATCH(patchRequest({ role: "admin" }), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: { user: { id: "USER1", role: "admin" } },
    });
    expect(updateAdminUserRoleMock).toHaveBeenCalledWith("USER1", "admin", "ADMIN1");
  });

  it("surfaces service guard errors with their status", async () => {
    updateAdminUserRoleMock.mockRejectedValueOnce(
      new AdminServiceError(
        "SELF_DEMOTION",
        "You cannot remove your own admin access. Ask another admin to do it.",
        400
      )
    );

    const response = await PATCH(patchRequest({ role: "customer" }), params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("SELF_DEMOTION");
  });
});
