import 'server-only';
import dbConnect from '@/lib/db';
import EmailSequence from '@/models/EmailSequence';
import type {
  EmailSequence as EmailSequenceType,
  EmailSequenceStep,
} from '@/types/email-sequence';



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

  return sequences as EmailSequenceType[];
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


export async function subscribeToSequence(data: {
  email: string;
  sequenceId: string;
  productId?: string;
  userId?: string;
}): Promise<{ _id: string; nextSendAt: Date } | null> {
  await dbConnect();
  const { EmailSequenceSubscription } = await import("@/models/EmailSequenceSubscription");
  const { EmailSequence } = await import("@/models/EmailSequence");

  const sequence = await EmailSequence.findById(data.sequenceId).lean();
  if (!sequence || !sequence.active) {
    return null;
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
    userId: data.userId || undefined,
    sequenceId: data.sequenceId,
    productId: data.productId || sequence.productId,
    currentStepIndex: 0,
    subscribedAt,
    nextSendAt,
  });

  return sub.toObject();
}
