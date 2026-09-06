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

export const BOOKING_RANGES = [
  "upcoming",
  "past",
  "next7",
  "next30",
  "next365",
] as const;

export type BookingRange = (typeof BOOKING_RANGES)[number];

export const BOOKING_SORTS = ["schedule", "recent"] as const;

export type BookingSort = (typeof BOOKING_SORTS)[number];

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