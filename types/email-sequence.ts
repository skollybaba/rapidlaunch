export type EmailSequenceStep = {
  index: number;
  subject: string;
  title?: string;
  body: string;
  delayHours: number;
};

export type EmailSequence = {
  _id: string;
  name: string;
  productId: string | { _id: string; title: string; slug: string };
  active: boolean;
  totalSteps: number;
  intervalValue: number;
  intervalUnit: 'hours' | 'days';
  intervalHours: number;
  steps: EmailSequenceStep[];
  createdAt: string;
  updatedAt: string;
};
