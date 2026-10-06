import { NextResponse } from "next/server";

import { subscribeToSequence } from "@/lib/services/sequence-service";
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

    return NextResponse.json({ ok: true, data: sub }, { status: 201 });
  } catch (error) {
    console.error("Error subscribing to sequence:", error);
    return NextResponse.json(
      { ok: false, error: { message: "Failed to subscribe" } },
      { status: 500 }
    );
  }
}
