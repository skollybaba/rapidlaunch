import 'server-only';
import dbConnect from '@/lib/db';
import EmailSequence from '@/models/EmailSequence';
import { EmailSequenceSubscription } from '@/models/EmailSequenceSubscription';
import { User } from '@/models/User';
import type {
  EmailSequence as EmailSequenceType,
  EmailSequenceStep,
} from '@/types/email-sequence';

const SUBSCRIBER_PAGE_SIZE = 200;
const SUBSCRIBER_PAGE_SIZE_MAX = 500;

export async function listSequences(filters: {
  productId?: string;
  active?: boolean;
} = {}): Promise<EmailSequenceType[]> {
  await dbConnect();

  const query: Record<string, unknown> = {};
  if (filters.productId) {
    query.productId = filters.productId;
  }
  if (filters.active !== undefined) {
    query.active = filters.active;
  }

  const sequences = await EmailSequence.find(query)
    .populate('productId', 'title slug')
    .sort({ createdAt: -1 })
    .lean();

  const sequenceIds = sequences.map((s) => s._id);
  const counts = sequenceIds.length
    ? await EmailSequenceSubscription.aggregate<{ _id: string; count: number }>([
        { $match: { sequenceId: { $in: sequenceIds } } },
        { $group: { _id: '$sequenceId', count: { $sum: 1 } } },
      ])
    : [];
  const countBySequenceId = new Map(
    counts.map((row) => [String(row._id), row.count] as [string, number])
  );

  return sequences.map((sequence) => ({
    ...sequence,
    subscriberCount: countBySequenceId.get(String(sequence._id)) ?? 0,
  })) as EmailSequenceType[];
}

export async function getSequenceById(id: string): Promise<EmailSequenceType | null> {
  await dbConnect();

  const sequence = await EmailSequence.findById(id)
    .populate('productId', 'title slug')
    .lean();

  return sequence as EmailSequenceType | null;
}

export async function createSequence(data: {
  name: string;
  productId: string;
  totalSteps: number;
  steps: EmailSequenceStep[];
}): Promise<EmailSequenceType> {
  await dbConnect();

  const sequence = await EmailSequence.create({
    name: data.name,
    productId: data.productId,
    totalSteps: data.totalSteps,
    steps: data.steps.map((step, i) => ({
      index: step.index ?? i,
      subject: step.subject,
      title: step.title || '',
      body: step.body,
      triggerType: step.triggerType || 'after_hours',
      delayHours: step.delayHours ?? step.sendAtHours ?? 0,
      sendAtHours: step.sendAtHours ?? step.delayHours ?? 0,
    })),
    active: false,
  });

  return sequence.toObject() as EmailSequenceType;
}

export async function updateSequence(
  id: string,
  data: Partial<{
    name: string;
    productId: string;
    totalSteps: number;

    steps: EmailSequenceStep[];
    active: boolean;
  }>
): Promise<EmailSequenceType | null> {
  await dbConnect();

  const update: Record<string, unknown> = { ...data };


  const sequence = await EmailSequence.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  })
    .populate('productId', 'title slug')
    .lean();

  return sequence as EmailSequenceType | null;
}

export async function deleteSequence(id: string): Promise<boolean> {
  await dbConnect();
  const result = await EmailSequence.deleteOne({ _id: id });
  return result.deletedCount === 1;
}


function firstNameOf(name: string | null | undefined): string | undefined {
  const token = (name ?? '').trim().split(/\s+/)[0];
  return token || undefined;
}

export type SequenceSubscriberStatus = 'pending' | 'completed' | 'cancelled';

export interface SequenceSubscriber {
  _id: string;
  email: string;
  name: string | null;
  status: SequenceSubscriberStatus;
  subscribedAt: string;
  lastSentAt: string | null;
  nextSendAt: string;
  currentStepIndex: number;
}

function toIso(value: unknown): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value as string).toISOString();
}

export async function listSequenceSubscribers(
  sequenceId: string,
  pagination: { limit?: number; skip?: number } = {}
): Promise<{ total: number; subscribers: SequenceSubscriber[] }> {
  await dbConnect();

  const limit = Math.min(
    Math.max(pagination.limit ?? SUBSCRIBER_PAGE_SIZE, 1),
    SUBSCRIBER_PAGE_SIZE_MAX
  );
  const skip = Math.max(pagination.skip ?? 0, 0);

  const [subscriptions, total] = await Promise.all([
    EmailSequenceSubscription.find({ sequenceId })
      .populate('userId', 'name')
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EmailSequenceSubscription.countDocuments({ sequenceId }),
  ]);

  const subscribers: SequenceSubscriber[] = subscriptions.map((sub) => {
    const user = sub.userId as { name?: string } | null | undefined;
    let status: SequenceSubscriberStatus = 'pending';
    if (sub.completedAt) status = 'completed';
    else if (sub.cancelledAt) status = 'cancelled';
    return {
      _id: String(sub._id),
      email: sub.email,
      name: sub.firstName || user?.name || null,
      status,
      subscribedAt: toIso(sub.subscribedAt),
      lastSentAt: sub.lastSentAt ? toIso(sub.lastSentAt) : null,
      nextSendAt: toIso(sub.nextSendAt),
      currentStepIndex: sub.currentStepIndex ?? 0,
    };
  });

  return { total, subscribers };
}

export type SequenceSubscriptionInput = {
  email: string;
  sequenceId: string;
  productId?: string;
  userId?: string;
  name?: string;
};

export async function subscribeToSequence(
  data: SequenceSubscriptionInput
): Promise<{ _id: string; nextSendAt: Date } | null> {
  await dbConnect();
  const { EmailSequence } = await import("@/models/EmailSequence");

  const sequence = await EmailSequence.findById(data.sequenceId).lean();
  if (!sequence || !sequence.active) {
    return null;
  }

  let firstName = firstNameOf(data.name);
  if (!firstName && data.userId) {
    const user = await User.findById(data.userId).select('name').lean();
    firstName = firstNameOf(user?.name);
  }

  const existing = await EmailSequenceSubscription.findOne({
    sequenceId: data.sequenceId,
    email: data.email,
    completedAt: null,
    cancelledAt: null,
  });
  if (existing) {
    return existing.toObject();
  }

  const firstStep = Array.isArray(sequence.steps)
    ? sequence.steps.find((s: EmailSequenceStep) => s.index === 0) || sequence.steps[0]
    : null;
  // Delay is measured from the moment the user subscribes.
  const delay =
    firstStep && firstStep.triggerType !== "immediate"
      ? firstStep.sendAtHours ?? firstStep.delayHours ?? 0
      : 0;
  const subscribedAt = new Date();
  const nextSendAt = new Date(subscribedAt.getTime() + delay * 60 * 60 * 1000);

  const sub = await EmailSequenceSubscription.create({
    email: data.email,
    firstName,
    userId: data.userId || undefined,
    sequenceId: data.sequenceId,
    productId: data.productId || sequence.productId,
    currentStepIndex: 0,
    subscribedAt,
    nextSendAt,
  });

  return sub.toObject();
}
