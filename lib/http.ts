export interface ApiResponseBody<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

/**
 * Parses a fetch response into the app's standard `{ ok, data?, error? }`
 * shape. Returns `null` when the response has no usable JSON body (for
 * example, an empty-body 500 from the server) so callers can show a friendly
 * message instead of a low-level JSON parse error.
 */
export async function readApiJson<T = unknown>(
  response: Response
): Promise<ApiResponseBody<T> | null> {
  try {
    return (await response.json()) as ApiResponseBody<T>;
  } catch {
    return null;
  }
}