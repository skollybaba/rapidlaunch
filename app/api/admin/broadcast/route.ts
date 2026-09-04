import type { NextRequest } from "next/server";

import { apiError, apiOk, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { sendEmailToAllUsers } from "@/lib/services/broadcast-service";
import { writeUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = newRequestId();

  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  }
  if (user.role !== "admin") {
    return apiError(403, "FORBIDDEN", "Admins only.", requestId);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "INVALID_FORM", "Invalid broadcast request.", requestId);
  }

  const title = (form.get("title") as string | null) ?? "";
  const subject = (form.get("subject") as string | null) ?? "";
  const body = (form.get("body") as string | null) ?? "";
  const file = form.get("attachment");

  let attachmentKeys: string[] = [];
  if (file instanceof File && file.size > 0) {
    const data = Buffer.from(await file.arrayBuffer());
    const stored = await writeUpload(data, file.name, file.type || "application/octet-stream");
    attachmentKeys = [stored.key];
  }

  try {
    const result = await sendEmailToAllUsers({ title, subject, body, attachmentKeys });
    return apiOk(result);
  } catch (error) {
    // Reuse the standard handler mapping by importing here to avoid circular
    // import at module load time.
    const { handleApiError } = await import("@/lib/api");
    return handleApiError(error, requestId);
  }
}
