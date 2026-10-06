import "server-only";

import { dbConnect } from "@/lib/db";
import { EmailSequenceSubscription } from "@/models/EmailSequenceSubscription";
import { createMailAdapter } from "@/lib/providers/mail";

interface SequenceStepDoc {
  index: number;
  subject: string;
  title?: string;
  body: string;
  triggerType?: "immediate" | "after_hours";
  delayHours?: number;
  sendAtHours?: number;
}

interface SequenceDoc {
  active: boolean;
  totalSteps: number;

  steps?: SequenceStepDoc[];
}

export interface DispatchResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  outcomes: Array<{
    subscriptionId: string;
    stepIndex: number;
    sent: boolean;
    error?: string;
  }>;
}

// The in-process timer and the admin "Run now" button share one process.
// Without this gate an overlapping run could send the same step twice.
let dispatchInFlight: Promise<DispatchResult> | null = null;

const CLAIM_TTL_MS = 10 * 60 * 1000;

export function dispatchEmailSequenceSteps(): Promise<DispatchResult> {
  if (dispatchInFlight) return dispatchInFlight;
  dispatchInFlight = runDispatch().finally(() => {
    dispatchInFlight = null;
  });
  return dispatchInFlight;
}

async function runDispatch(): Promise<DispatchResult> {
  await dbConnect();

  const now = new Date();

  // Drop claims left behind by a crashed process so those emails retry.
  await EmailSequenceSubscription.updateMany(
    {
      dispatchingAt: { $ne: null, $lte: new Date(now.getTime() - CLAIM_TTL_MS) },
    },
    { $set: { dispatchingAt: null } }
  );

  const due = await EmailSequenceSubscription.find({
    completedAt: null,
    cancelledAt: null,
    nextSendAt: { $lte: now },
    dispatchingAt: null,
  })
    .select({ _id: 1 })
    .lean()
    .exec();

  if (!due.length) {
    return { processed: 0, sent: 0, skipped: 0, failed: 0, outcomes: [] };
  }

  const subscriptions = await EmailSequenceSubscription.find({
    _id: { $in: due.map((d) => d._id) },
    dispatchingAt: null,
  })
    .populate("sequenceId")
    .lean()
    .exec();

  if (!subscriptions.length) {
    return {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      outcomes: [],
    };
  }

  const adapter = createMailAdapter();
  const outcomes: DispatchResult["outcomes"] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    // Atomic claim: only one runner may own this subscription for this tick.
    const claimed = await EmailSequenceSubscription.findOneAndUpdate(
      { _id: subscription._id, dispatchingAt: null },
      { $set: { dispatchingAt: now } },
      { new: true }
    ).lean();
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const sequence = subscription.sequenceId as unknown as SequenceDoc | null;
    if (!sequence || !sequence.active) {
      await releaseClaim(subscription._id, {});
      skipped += 1;
      continue;
    }

    const currentStepIndex = subscription.currentStepIndex || 0;
    const steps = Array.isArray(sequence.steps) ? sequence.steps : [];
    const step = steps.find((s) => s.index === currentStepIndex);

    if (!step) {
      // No step to send, mark as completed
      await releaseClaim(subscription._id, {
        completedAt: now,
        lastSentAt: now,
        lastSentStepIndex: currentStepIndex,
      });
      skipped += 1;
      continue;
    }

    try {
      await adapter.sendTemplateEmail({
        templateKey: "sequence_step",
        to: subscription.email,
        variables: {
          subject: step.subject,
          title: step.title || step.subject,
          body: step.body,
        },
      });

      sent += 1;
      const isLastStep = currentStepIndex >= (sequence.totalSteps - 1) || currentStepIndex >= steps.length - 1;

      const base = subscription.subscribedAt
        ? new Date(subscription.subscribedAt)
        : new Date(subscription.createdAt ?? now);

      if (isLastStep) {
        await releaseClaim(subscription._id, {
          completedAt: now,
          lastSentAt: now,
          lastSentStepIndex: currentStepIndex,
        });
      } else {
        const nextStepIndex = currentStepIndex + 1;
        const nextStep = steps.find((s) => s.index === nextStepIndex);
        // Delay is measured from when the user entered the sequence, not from the
        // previous email: a step "at 48 hours" fires 48h after subscription.
        const nextDelayHours =
          nextStep && nextStep.triggerType !== "immediate"
            ? nextStep.sendAtHours ?? nextStep.delayHours ?? 0
            : 0;
        const nextSendAt = new Date(base.getTime() + nextDelayHours * 60 * 60 * 1000);

        await releaseClaim(subscription._id, {
          currentStepIndex: nextStepIndex,
          nextSendAt,
          lastSentAt: now,
          lastSentStepIndex: currentStepIndex,
        });
      }

      outcomes.push({
        subscriptionId: String(subscription._id),
        stepIndex: currentStepIndex,
        sent: true,
      });
    } catch (error) {
      failed += 1;
      await releaseClaim(subscription._id, undefined, { $inc: { failureCount: 1 } });
      outcomes.push({
        subscriptionId: String(subscription._id),
        stepIndex: currentStepIndex,
        sent: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Failed to send sequence step", {
        subscriptionId: subscription._id,
        error,
      });
    }
  }

  return {
    processed: subscriptions.length,
    sent,
    skipped,
    failed,
    outcomes,
  };
}

/** Applies the outcome fields and always frees the claim. */
async function releaseClaim(
  id: unknown,
  set?: Record<string, unknown>,
  extra: Record<string, unknown> = {}
): Promise<void> {
  await EmailSequenceSubscription.updateOne(
    { _id: id },
    { $set: { ...(set ?? {}), dispatchingAt: null }, ...extra }
  );
}
