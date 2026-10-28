import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getProfileSettings,
  setProfileImage,
} from "@/lib/services/profile-settings-service";
import { deleteUpload } from "@/lib/storage";

export const runtime = "nodejs";

function isHttpsUrl(value: string): boolean {
  if (value === "") return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const updateProfileSettingsSchema = z
  .object({
    imageUrl: z
      .string()
      .trim()
      .max(2048)
      .refine(isHttpsUrl, "Profile photo must be a valid https URL."),
    imageKey: z.string().trim().max(400).optional(),
  })
  .strict();

type AdminResult =
  | { error: NextResponse }
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> };

async function currentAdmin(requestId: string): Promise<AdminResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId),
    };
  }
  if (user.role !== "admin") {
    return { error: apiError(403, "FORBIDDEN", "Admins only.", requestId) };
  }
  return { user };
}

export async function GET(): Promise<NextResponse> {
  const requestId = newRequestId();
  const auth = await currentAdmin(requestId);
  if ("error" in auth) return auth.error;

  try {
    return apiOk(await getProfileSettings());
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = newRequestId();
  const auth = await currentAdmin(requestId);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(
      400,
      "INVALID_JSON",
      "Request body must be valid JSON",
      requestId
    );
  }

  try {
    const parsed = updateProfileSettingsSchema.parse(body);
    const previous = await getProfileSettings();
    const nextKey = parsed.imageUrl ? parsed.imageKey : undefined;

    const saved = await setProfileImage(
      parsed.imageUrl,
      nextKey,
      auth.user.email
    );

    if (previous.imageKey && previous.imageKey !== nextKey) {
      try {
        await deleteUpload(previous.imageKey);
      } catch (error) {
        console.error("Failed to delete the replaced profile photo", {
          requestId,
          error,
        });
      }
    }

    return apiOk(saved);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
