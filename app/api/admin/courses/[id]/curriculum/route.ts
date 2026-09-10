import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import {
  clearCourseCurriculum,
  setCourseCurriculum,
} from "@/lib/services/admin-service";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin") return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "INVALID_FORM", "Invalid form data", requestId);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "Attach a curriculum PDF file.",
      requestId
    );
  }

  try {
    const data = Buffer.from(await file.arrayBuffer());
    const updated = await setCourseCurriculum(id, {
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      data,
    });
    return apiOk({ id: updated.id, fileName: file.name, size: file.size });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin") return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  try {
    const updated = await clearCourseCurriculum(id);
    return apiOk({ id: updated.id });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}