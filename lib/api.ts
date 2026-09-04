import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { OrderServiceError } from "@/lib/services/order-service";
import { AuthServiceError } from "@/lib/services/auth-service";
import { ProfileServiceError } from "@/lib/services/profile-service";
import { BroadcastServiceError } from "@/lib/services/broadcast-service";
import { AdminServiceError } from "@/lib/services/admin-service";
import { ResourceServiceError } from "@/lib/services/resource-service";

export function newRequestId(): string {
  return randomUUID();
}

export function apiOk<T>(data: T) {
  return NextResponse.json({ ok: true, data }, { status: 200 });
}

export function apiError(
  status: number,
  code: string,
  message: string,
  requestId?: string
) {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, requestId },
    },
    { status }
  );
}

export function handleApiError(
  error: unknown,
  requestId: string
): NextResponse {
  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    return apiError(400, "VALIDATION_ERROR", message, requestId);
  }

  if (error instanceof OrderServiceError) {
    return apiError(error.status, error.code, error.message, requestId);
  }

  if (error instanceof AuthServiceError) {
    return apiError(error.status, error.code, error.message, requestId);
  }

  if (error instanceof ProfileServiceError) {
    return apiError(error.status, error.code, error.message, requestId);
  }

  if (error instanceof BroadcastServiceError) {
    return apiError(error.status, error.code, error.message, requestId);
  }

  if (error instanceof AdminServiceError) {
    return apiError(error.status, error.code, error.message, requestId);
  }

  if (error instanceof ResourceServiceError) {
    return apiError(error.status, error.code, error.message, requestId);
  }

  return apiError(
    500,
    "INTERNAL_ERROR",
    "Something went wrong. Please try again.",
    requestId
  );
}