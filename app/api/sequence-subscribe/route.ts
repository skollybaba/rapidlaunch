import { NextResponse } from "next/server";

import { subscribeToSequence } from "@/lib/services/sequence-service";
import { dispatchEmailSequenceSteps } from "@/lib/services/sequence-dispatch-service";
import { subscribeToSequenceSchema } from "@/lib/validation/sequence-subscription";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = subscribeToSequenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const sub = await subscribeToSequence(parsed.data);
    if (!sub) {
      return NextResponse.json(
        { ok: false, error: { message: "Sequence not found or inactive" } },
        { status: 404 }
      );
    }

    // A first step marked "immediately on subscribe" is due the moment the
    // subscription is created. Fire a dispatch now (best effort) so it does not
    // wait for the next scheduler tick; the scheduler retries otherwise.
    void dispatchEmailSequenceSteps().catch((error) => {
      console.error("Immediate sequence dispatch failed", { error });
    });

    return NextResponse.json({ ok: true, data: sub }, { status: 201 });
  } catch (error) {
    console.error("Error subscribing to sequence:", error);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to subscribe" } },
      { status: 500 }
    );
  }
}
