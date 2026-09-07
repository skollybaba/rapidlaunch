import { after } from "next/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  processPaystackWebhook,
  processPaystackWebhookEvent,
} from "@/lib/services/order-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  // 1. Verify the Paystack SHA512 signature and claim the event for
  // idempotency. This is the only DB work we do in the request path so
  // Paystack gets an instant acknowledgement.
  const result = await processPaystackWebhook(rawBody, signature);

  if (!result.accepted) {
    return NextResponse.json(
      { ok: false, error: { code: result.reason, message: "Webhook rejected" } },
      { status: 401 }
    );
  }

  // 2. Do NOT run the heavy work (payment + order settlement, enrollment,
  // confirmation email, WhatsApp alerts) in the request handler. Serverless
  // functions can time out while awaiting slow providers, which makes
  // Paystack retry or report the delivery as failed.
  if (!result.duplicate) {
    after(() =>
      processPaystackWebhookEvent(result).catch((error) => {
        console.error(
          "Background Paystack webhook processing failed",
          result.requestId,
          { error }
        );
      })
    );
  }

  // 3. Immediately return 200 OK to Paystack.
  return new Response("OK", { status: 200 });
}