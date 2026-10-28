import "server-only";

import { dbConnect } from "@/lib/db";
import { PlatformSetting } from "@/models/PlatformSetting";
import type { PlatformSettingDoc, ProfileSettings } from "@/types/settings";

const PROFILE_SETTINGS_KEY = "profile";

/**
 * Read the public About page profile photo. A settings outage must never take
 * the marketing site down, so failures fall back to the page's built-in
 * placeholder rather than throwing.
 */
export async function getProfileSettings(): Promise<ProfileSettings> {
  try {
    await dbConnect();
    const doc = await PlatformSetting.findOne({ key: PROFILE_SETTINGS_KEY })
      .lean<PlatformSettingDoc | null>()
      .exec();

    return {
      imageUrl: doc?.profileImageUrl?.trim() ?? "",
      imageKey: doc?.profileImageKey?.trim() || undefined,
    };
  } catch (error) {
    console.error("Failed to read profile settings; using the placeholder", {
      error,
    });
    return { imageUrl: "" };
  }
}

export async function setProfileImage(
  imageUrl: string,
  imageKey?: string,
  updatedBy?: string
): Promise<ProfileSettings> {
  await dbConnect();
  await PlatformSetting.updateOne(
    { key: PROFILE_SETTINGS_KEY },
    {
      $set: {
        profileImageUrl: imageUrl.trim(),
        profileImageKey: imageUrl.trim() ? imageKey?.trim() ?? "" : "",
        updatedBy,
      },
    },
    { upsert: true }
  );

  return getProfileSettings();
}
