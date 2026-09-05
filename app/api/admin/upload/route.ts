import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { writeUpload } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // Cloudinary free plan upload cap

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
    return apiError(400, "INVALID_FORM", "Invalid upload request.", requestId);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError(400, "NO_FILE", "No file provided.", requestId);
  }

  if (file.size > MAX_BYTES) {
    return apiError(413, "FILE_TOO_LARGE", "File must be under 10 MB.", requestId);
  }

  try {
    const data = Buffer.from(await file.arrayBuffer());
    const stored = await writeUpload(data, file.name, file.type || "application/octet-stream");
    return apiOk({ ...stored });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
