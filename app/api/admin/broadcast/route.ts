import type { NextRequest } from "next/server";

import { apiError, apiOk, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { sendBroadcast } from "@/lib/services/broadcast-service";
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
  const bodyHtml = (form.get("bodyHtml") as string | null) ?? "";
  const segmentType = (form.get("segmentType") as string | null) ?? "";
  const productId = (form.get("productId") as string | null) || undefined;
  const scheduledFor = (form.get("scheduledFor") as string | null) || undefined;
  const importedJson = (form.get("importedRecipients") as string | null) || undefined;

  let importedRecipients: unknown;
  if (importedJson) {
    try {
      importedRecipients = JSON.parse(importedJson);
    } catch {
      return apiError(
        400,
        "INVALID_IMPORT",
        "The imported recipient list could not be read.",
        requestId
      );
    }
  }

  let attachmentKeys: string[] = [];
  let attachmentName: string | undefined;
  const file = form.get("attachment");
  if (file instanceof File && file.size > 0) {
    const data = Buffer.from(await file.arrayBuffer());
    const stored = await writeUpload(data, file.name, file.type || "application/octet-stream");
    attachmentKeys = [stored.key];
    attachmentName = file.name;
  }

  try {
    const result = await sendBroadcast(
      {
        title,
        subject,
        bodyHtml,
        segmentType,
        productId,
        scheduledFor,
        importedRecipients,
        attachmentKeys,
        attachmentName,
      },
      { userId: String(user._id), email: user.email }
    );
    return apiOk(result);
  } catch (error) {
    // Reuse the standard handler mapping by importing here to avoid circular
    // import at module load time.
    const { handleApiError } = await import("@/lib/api");
    return handleApiError(error, requestId);
  }
}
