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
  createdAt: string;
  updatedAt: string;
};
