import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getCurrentUser: getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const {
  getProfileSettings: getProfileSettingsMock,
  setProfileImage: setProfileImageMock,
  deleteUpload: deleteUploadMock,
} = vi.hoisted(() => ({
  getProfileSettings: vi.fn(),
  setProfileImage: vi.fn(),
  deleteUpload: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/services/profile-settings-service", () => ({
  getProfileSettings: getProfileSettingsMock,
  setProfileImage: setProfileImageMock,
}));
vi.mock("@/lib/storage", () => ({ deleteUpload: deleteUploadMock }));

import { PATCH } from "@/app/api/admin/settings/profile/route";

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/settings/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({
    _id: "ADMIN1",
    role: "admin",
    email: "owner@example.com",
  });
  getProfileSettingsMock.mockResolvedValue({ imageUrl: "" });
  setProfileImageMock.mockImplementation((imageUrl: string, imageKey?: string) =>
    Promise.resolve({ imageUrl, imageKey })
  );
  deleteUploadMock.mockResolvedValue(undefined);
});

describe("PATCH /api/admin/settings/profile", () => {
  it("requires a signed-in user", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const response = await PATCH(
      patchRequest({ imageUrl: "https://example.com/me.jpg" })
    );

    expect(response.status).toBe(401);
    expect(setProfileImageMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ _id: "CUST1", role: "customer" });
    const response = await PATCH(
      patchRequest({ imageUrl: "https://example.com/me.jpg" })
    );

    expect(response.status).toBe(403);
    expect(setProfileImageMock).not.toHaveBeenCalled();
  });

  it("rejects a non-https or invalid URL", async () => {
    const response = await PATCH(
      patchRequest({ imageUrl: "http://example.com/me.jpg" })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(setProfileImageMock).not.toHaveBeenCalled();
  });

  it("saves the image for an admin", async () => {
    const response = await PATCH(
      patchRequest({
        imageUrl: "https://res.cloudinary.com/demo/image/upload/me.jpg",
        imageKey: "abc.jpg",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: {
        imageUrl: "https://res.cloudinary.com/demo/image/upload/me.jpg",
        imageKey: "abc.jpg",
      },
    });
    expect(setProfileImageMock).toHaveBeenCalledWith(
      "https://res.cloudinary.com/demo/image/upload/me.jpg",
      "abc.jpg",
      "owner@example.com"
    );
  });

  it("removes the stored image and cleans up the old upload", async () => {
    getProfileSettingsMock.mockResolvedValue({
      imageUrl: "https://res.cloudinary.com/demo/image/upload/old.jpg",
      imageKey: "old.jpg",
    });

    const response = await PATCH(patchRequest({ imageUrl: "" }));

    expect(response.status).toBe(200);
    expect(setProfileImageMock).toHaveBeenCalledWith(
      "",
      undefined,
      "owner@example.com"
    );
    expect(deleteUploadMock).toHaveBeenCalledWith("old.jpg");
  });
});
