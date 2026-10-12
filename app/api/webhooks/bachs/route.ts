import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  processBachsWebhook,
  processBachsWebhookEvent,
} from "@/lib/services/order-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  // Bachs signs "{timestamp}.{rawBody}". The timestamp can arrive standalone
  // (X-Bachs-Timestamp) or inside the combined X-Bachs-Signature-V2 header.
  const timestamp =
    request.headers.get("x-bachs-timestamp") ??
    request.headers.get("x-bachs-signature-v2") ??
    "";
  const signature =
    request.headers.get("x-bachs-signature") ??
    request.headers.get("x-bachs-signature-v2") ??
    "";

  const result = await processBachsWebhook(rawBody, signature, timestamp);

  if (!result.accepted) {
    return NextResponse.json(
      { ok: false, error: { code: result.reason, message: "Webhook rejected" } },
      { status: 401 }
    );
  }

  if (!result.duplicate) {
    after(() =>
      processBachsWebhookEvent(result).catch((error) => {
        console.error(
          "Background Bachs webhook processing failed",
          result.requestId,
          { error }
        );
      })
    );
  }

  return new Response("OK", { status: 200 });
}
