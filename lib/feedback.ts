import type { ToastInput } from "@/components/ui/toast";

/**
 * Helpers for turning an API response into a message a visitor can act on.
 *
 * Client components should never surface a raw payload or a technical string.
 * These read the shared `{ ok, error: { code, message } }` envelope and fall back
 * to wording the caller controls.
 */

interface ErrorEnvelope {
  ok?: boolean;
  error?: { code?: string; message?: string };
}

function asEnvelope(payload: unknown): ErrorEnvelope | null {
  if (typeof payload !== "object" || payload === null) return null;
  return payload as ErrorEnvelope;
}

/** The safe message from an error envelope, or `fallback` when absent. */
export function readApiError(payload: unknown, fallback: string): string {
  const message = asEnvelope(payload)?.error?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

/** The machine-readable error code, useful for branching on auth failures. */
export function readApiErrorCode(payload: unknown): string | undefined {
  const code = asEnvelope(payload)?.error?.code;
  return typeof code === "string" && code.trim() ? code : undefined;
}

/** True when the body reports failure even if the status code was not checked. */
export function isApiFailure(payload: unknown): boolean {
  const envelope = asEnvelope(payload);
  return envelope ? envelope.ok === false : false;
}

export const NETWORK_ERROR_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

/**
 * Builds an error toast from a failed response, wiring a retry action when the
 * caller can safely repeat the request.
 */
export function apiErrorToast(
  payload: unknown,
  fallback: string,
  retry?: () => void
): ToastInput {
  const input: ToastInput = { title: readApiError(payload, fallback) };
  if (retry) {
    input.action = { label: "Retry", onClick: retry };
  }
  return input;
}