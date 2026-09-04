export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "ACTION_REQUIRED",
  "CANCELLED",
  "FAILED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_PROVIDERS = ["manual", "google_calendar"] as const;

export type BookingProvider = (typeof BOOKING_PROVIDERS)[number];

export const BOOKING_REMINDER_POINTS = ["24h", "1h"] as const;

export type BookingReminderPoint = (typeof BOOKING_REMINDER_POINTS)[number];

export interface BookingReminderRecord {
  point: BookingReminderPoint;
  sentAt: Date;
}

export interface BookingAnswers {
  whatYouAreBuilding?: string;
  currentStage?: string;
  helpNeeded?: string;
}

export interface BookingDoc {
  _id: unknown;
  orderId: unknown;
  productId: unknown;
  customerEmail: string;
  customerName?: string;
  answers?: BookingAnswers;
  timezone?: string;
  requestedStartTime?: Date | null;
  scheduledStartTime?: Date | null;
  scheduledEndTime?: Date | null;
  provider: BookingProvider;
  providerBookingUri?: string;
  providerEventUri?: string;
  meetingUrl?: string;
  schedulingUrl?: string;
  status: BookingStatus;
  attempts: number;
  lastError?: string;
  bookedAt?: Date | null;
  reminders?: BookingReminderRecord[];
  createdAt?: Date;
  updatedAt?: Date;
}