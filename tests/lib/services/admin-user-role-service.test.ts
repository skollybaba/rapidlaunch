import { beforeEach, describe, expect, it, vi } from "vitest";

const { findById, countDocuments, updateOne } = vi.hoisted(() => ({
  findById: vi.fn(),
  countDocuments: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/User", () => ({
  User: { findById, countDocuments, updateOne },
}));

import {
  AdminServiceError,
  updateAdminUserRole,
} from "@/lib/services/admin-service";

function findChain(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function countChain(value: number) {
  return { exec: vi.fn().mockResolvedValue(value) } as never;
}

function updateChain() {
  return { exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  findById.mockImplementation(() =>
    findChain({ _id: "USER1", email: "person@example.com", role: "customer" })
  );
  countDocuments.mockReturnValue(countChain(1));
  updateOne.mockReturnValue(updateChain());
});

describe("updateAdminUserRole", () => {
  it("promotes a customer to admin", async () => {
    const result = await updateAdminUserRole("507f1f77bcf86cd799439011", "admin", "ADMIN1");

    expect(result).toEqual({ id: "USER1", role: "admin" });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: "USER1" },
      { $set: { role: "admin" } }
    );
    expect(countDocuments).not.toHaveBeenCalled();
  });

  it("demotes an admin to customer when another admin remains", async () => {
    findById.mockImplementation(() =>
      findChain({ _id: "USER1", email: "person@example.com", role: "admin" })
    );

    const result = await updateAdminUserRole("507f1f77bcf86cd799439011", "customer", "ADMIN2");

    expect(result).toEqual({ id: "USER1", role: "customer" });
    expect(countDocuments).toHaveBeenCalledWith({
      role: "admin",
      _id: { $ne: "USER1" },
    });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: "USER1" },
      { $set: { role: "customer" } }
    );
  });

  it("refuses to let an admin demote themselves", async () => {
    await expect(
      updateAdminUserRole("507f1f77bcf86cd799439011", "customer", "USER1")
    ).rejects.toMatchObject({ code: "SELF_DEMOTION", status: 400 });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("refuses to demote the last remaining admin", async () => {
    findById.mockImplementation(() =>
      findChain({ _id: "USER1", email: "person@example.com", role: "admin" })
    );
    countDocuments.mockReturnValue(countChain(0));

    await expect(
      updateAdminUserRole("507f1f77bcf86cd799439011", "customer", "USER2")
    ).rejects.toMatchObject({ code: "LAST_ADMIN", status: 400 });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown user", async () => {
    findById.mockReturnValue(findChain(null));

    const error = await updateAdminUserRole(
      "507f1f77bcf86cd799439011",
      "admin",
      "ADMIN1"
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AdminServiceError);
    expect(error).toMatchObject({ code: "USER_NOT_FOUND", status: 404 });
  });

  it("returns 404 for a malformed user id without querying", async () => {
    await expect(
      updateAdminUserRole("not-an-id", "admin", "ADMIN1")
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND", status: 404 });
    expect(findById).not.toHaveBeenCalled();
  });
});
