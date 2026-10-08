export type EmailSequenceStep = {
  index: number;
  subject: string;
  title?: string;
  body: string;
  triggerType: 'immediate' | 'after_hours';
  delayHours: number;
  sendAtHours: number;
};

export type EmailSequence = {
  _id: string;
  name: string;
  productId: string | { _id: string; title: string; slug: string };
  active: boolean;
  totalSteps: number;
  steps: EmailSequenceStep[];
  subscriberCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type EmailSequenceSubscriberStatus = 'pending' | 'completed' | 'cancelled';

export type EmailSequenceSubscriber = {
  _id: string;
  email: string;
  name: string | null;
  status: EmailSequenceSubscriberStatus;
  subscribedAt: string;
  lastSentAt: string | null;
  nextSendAt: string;
  currentStepIndex: number;
};
