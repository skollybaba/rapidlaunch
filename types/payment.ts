export const PAYMENT_STATUSES = [
  "CREATED",
  "INITIALIZATION_FAILED",
  "PENDING",
  "ABANDONED",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "SUSPICIOUS",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_TYPES = [
  "CLASSROOM_ENROLLMENT",
  "BOOK_DOWNLOAD",
  "BOOK_SHIPMENT",
  "BOOKING",
  "MVP_SERVICE",
] as const;

export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const FULFILLMENT_STATUSES = [
  "PENDING",
  "FULFILLED",
  "ACTION_REQUIRED",
  "RETRY_PENDING",
  "FAILED",
  "REVOKED",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const PAYMENT_EVENT_PROCESSING_STATUSES = [
  "RECEIVED",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
  "IGNORED",
] as const;

export type PaymentEventProcessingStatus =
  (typeof PAYMENT_EVENT_PROCESSING_STATUSES)[number];

export interface PaymentDoc {
  _id: unknown;
  orderId: unknown;
  provider: string;
  providerReference: string;
  authorizationUrl?: string;
  accessCode?: string;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  verificationPayload?: unknown;
  paidAt?: Date | null;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentEventDoc {
  _id: unknown;
  provider: string;
  providerEventKey: string;
  eventType: string;
  signatureValid: boolean;
  rawPayload: unknown;
  receivedAt: Date;
  processedAt?: Date | null;
  processingStatus: PaymentEventProcessingStatus;
  errorMessage?: string;
}

export interface FulfillmentDoc {
  _id: unknown;
  orderId: unknown;
  orderItemId?: unknown;
  type: FulfillmentType;
  status: FulfillmentStatus;
  attempts: number;
  lastError?: string;
  fulfilledAt?: Date | null;
  metadata: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}