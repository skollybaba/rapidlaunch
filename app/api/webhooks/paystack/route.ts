import { NextRequest, NextResponse } from "next/server";

import { processPaystackWebhook } from "@/lib/services/order-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  const result = await processPaystackWebhook(rawBody, signature);

  if (!result.accepted) {
    return NextResponse.json(
      { ok: false, error: { code: result.reason, message: "Webhook rejected" } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: { accepted: true, duplicate: result.duplicate },
  });
}