import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { OrderServiceError } from "@/lib/services/order-service";

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

  return apiError(
    500,
    "INTERNAL_ERROR",
    "Something went wrong. Please try again.",
    requestId
  );
}