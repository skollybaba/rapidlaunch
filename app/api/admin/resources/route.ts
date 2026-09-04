import { NextRequest } from "next/server";

import { apiError, apiOk, handleApiError, newRequestId } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { RESOURCE_TYPES, type ResourceType } from "@/types/resource";
import { createResource, getAdminResources } from "@/lib/services/resource-service";
import type { AdminResourceQuery } from "@/lib/services/resource-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin") return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  try {
    const { searchParams } = new URL(request.url);
    const rawType = searchParams.get("type") ?? "";
    const rawPublished = searchParams.get("published");
    const query: AdminResourceQuery = {
      type: (RESOURCE_TYPES as readonly string[]).includes(rawType)
        ? (rawType as ResourceType)
        : undefined,
      q: searchParams.get("q") ?? "",
      published:
        rawPublished === "true"
          ? true
          : rawPublished === "false"
            ? false
            : undefined,
    };
    const resources = await getAdminResources(query);
    return apiOk({ resources });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const user = await getCurrentUser();
  if (!user) return apiError(401, "UNAUTHENTICATED", "You must be signed in.", requestId);
  if (user.role !== "admin") return apiError(403, "FORBIDDEN", "Admins only.", requestId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Invalid JSON", requestId);
  }

  try {
    const resource = await createResource(body);
    return apiOk({ id: String(resource._id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
