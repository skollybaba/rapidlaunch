import "server-only";

import { dbConnect } from "@/lib/db";
import { AnalyticsEvent } from "@/models/AnalyticsEvent";
import type { AnalyticsEventType } from "@/types/analytics";

export interface EmitAnalyticsEventInput {
  eventType: AnalyticsEventType;
  eventKey: string;
  productId?: string | null;
  productType?: string | null;
  customerEmail?: string | null;
  userId?: string | null;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Records a product analytics event.
 *
 * Best effort by contract: the funnel must never break checkout or settlement,
 * so a failed record is logged and swallowed. `eventKey` is a unique index, so
 * a redelivered webhook or a retried verification cannot double-count an
 * order-scoped step.
 */
export async function emitAnalyticsEvent(
  input: EmitAnalyticsEventInput
): Promise<void> {
  try {
    await dbConnect();
    await AnalyticsEvent.updateOne(
      { eventKey: input.eventKey },
      {
        $setOnInsert: {
          eventType: input.eventType,
          productId: input.productId ?? null,
          productType: input.productType ?? null,
          customerEmail: input.customerEmail ?? null,
          userId: input.userId ?? null,
          occurredAt: input.occurredAt ?? new Date(),
          metadata: input.metadata ?? {},
        },
      },
      { upsert: true }
    ).exec();
  } catch (error) {
    // Analytics is never allowed to break the checkout or settlement path.
    console.error("Failed to record analytics event", input.eventType, {
      error,
    });
  }
}

/** Builds the deterministic dedupe key for an order-scoped funnel step. */
export function orderEventKey(
  eventType: AnalyticsEventType,
  orderReference: string
): string {
  return `${eventType}:${orderReference}`;
}