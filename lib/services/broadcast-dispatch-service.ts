import "server-only";

import { dbConnect } from "@/lib/db";
import { Broadcast } from "@/models/Broadcast";
import { deliverScheduledBroadcast } from "@/lib/services/broadcast-service";

export interface BroadcastDispatchResult {
  processed: number;
  delivered: number;
  skipped: number;
  failed: number;
  outcomes: Array<{ broadcastId: string; delivered: boolean; error?: string }>;
}

// The in-process timer and the HTTP cron endpoint can overlap. Without this
// gate two runners would race the same claim sweep (harmless) and duplicate
// work in the same tick (wasteful).
let dispatchInFlight: Promise<BroadcastDispatchResult> | null = null;

const CLAIM_TTL_MS = 10 * 60 * 1000;

export function dispatchDueBroadcasts(): Promise<BroadcastDispatchResult> {
  if (dispatchInFlight) return dispatchInFlight;
  dispatchInFlight = runDispatch().finally(() => {
    dispatchInFlight = null;
  });
  return dispatchInFlight;
}

async function runDispatch(): Promise<BroadcastDispatchResult> {
  await dbConnect();

  const now = new Date();

  // Drop claims left behind by a crashed process so those campaigns retry.
  await Broadcast.updateMany(
    {
      status: "SCHEDULED",
      dispatchingAt: { $ne: null, $lte: new Date(now.getTime() - CLAIM_TTL_MS) },
    },
    { $set: { dispatchingAt: null } }
  );

  const due = await Broadcast.find({
    status: "SCHEDULED",
    scheduledFor: { $lte: now },
    dispatchingAt: null,
  })
    .select({ _id: 1 })
    .lean()
    .exec();

  const result: BroadcastDispatchResult = {
    processed: 0,
    delivered: 0,
    skipped: 0,
    failed: 0,
    outcomes: [],
  };
  if (!due.length) return result;

  for (const doc of due) {
    const broadcastId = String(doc._id);
    result.processed += 1;
    try {
      const outcome = await deliverScheduledBroadcast(broadcastId);
      if (outcome.delivered) {
        result.delivered += 1;
      } else if (outcome.skipped) {
        result.skipped += 1;
      } else {
        // Terminal failure (empty body, audience vanished) — recorded on the
        // broadcast itself, so it must not be retried every tick.
        result.failed += 1;
      }
      result.outcomes.push({
        broadcastId,
        delivered: outcome.delivered,
        ...(outcome.error ? { error: outcome.error } : {}),
      });
    } catch (error) {
      // Release happened inside the deliverer; the next tick retries.
      result.failed += 1;
      result.outcomes.push({
        broadcastId,
        delivered: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Scheduled broadcast dispatch failed", {
        broadcastId,
        error,
      });
    }
  }

  return result;
}
