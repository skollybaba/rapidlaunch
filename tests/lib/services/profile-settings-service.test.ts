import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/PlatformSetting", () => ({
  PlatformSetting: { findOne: vi.fn(), updateOne: vi.fn() },
}));

import {
  getProfileSettings,
  setProfileImage,
} from "@/lib/services/profile-settings-service";
import { PlatformSetting } from "@/models/PlatformSetting";

const mockFindOne = vi.mocked(PlatformSetting.findOne);
const mockUpdateOne = vi.mocked(PlatformSetting.updateOne);

function lean(value: unknown): never {
  return { lean: () => ({ exec: () => Promise.resolve(value) }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getProfileSettings", () => {
  it("returns the stored profile image and key", async () => {
    mockFindOne.mockReturnValue(
      lean({
        profileImageUrl: "https://res.cloudinary.com/demo/image/upload/me.jpg",
        profileImageKey: "abc.jpg",
      })
    );

    await expect(getProfileSettings()).resolves.toEqual({
      imageUrl: "https://res.cloudinary.com/demo/image/upload/me.jpg",
      imageKey: "abc.jpg",
    });
  });

  it("returns an empty image when nothing is stored", async () => {
    mockFindOne.mockReturnValue(lean(null));
    await expect(getProfileSettings()).resolves.toEqual({ imageUrl: "" });
  });

  it("falls back to the placeholder when the database is unreachable", async () => {
    mockFindOne.mockImplementation(() => {
      throw new Error("no connection");
    });

    await expect(getProfileSettings()).resolves.toEqual({ imageUrl: "" });
  });
});

describe("setProfileImage", () => {
  it("upserts the image and acting admin, then returns the saved value", async () => {
    mockFindOne.mockReturnValue(
      lean({
        profileImageUrl: "https://res.cloudinary.com/demo/image/upload/me.jpg",
        profileImageKey: "abc.jpg",
      })
    );
    mockUpdateOne.mockResolvedValue({} as never);

    const saved = await setProfileImage(
      "https://res.cloudinary.com/demo/image/upload/me.jpg",
      "abc.jpg",
      "owner@example.com"
    );

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { key: "profile" },
      {
        $set: {
          profileImageUrl: "https://res.cloudinary.com/demo/image/upload/me.jpg",
          profileImageKey: "abc.jpg",
          updatedBy: "owner@example.com",
        },
      },
      { upsert: true }
    );
    expect(saved.imageUrl).toContain("me.jpg");
  });

  it("clears the key when removing the photo", async () => {
    mockFindOne.mockReturnValue(lean({ profileImageUrl: "" }));
    mockUpdateOne.mockResolvedValue({} as never);

    await setProfileImage("", "abc.jpg", "owner@example.com");

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { key: "profile" },
      {
        $set: {
          profileImageUrl: "",
          profileImageKey: "",
          updatedBy: "owner@example.com",
        },
      },
      { upsert: true }
    );
  });
});
