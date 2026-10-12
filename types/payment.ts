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

/**
 * The payment gateways the platform can settle through. The active provider is
 * chosen in the back office; "paystack" is the historical default. The value is
 * stored on each `Payment` record so a transaction is always reconciled against
 * the provider that actually created it, even if the toggle changes later.
 */
export const PAYMENT_PROVIDERS = ["paystack", "bachs"] as const;

export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

export type ProviderTransactionStatus =
  | "success"
  | "failed"
  | "abandoned"
  | "unknown";

export interface InitializeTransactionInput {
  amountMinor: number;
  currency: string;
  email: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  /**
   * Provider-side session identifier when the marketplace issues one (Bachs
   * `checkout_id`). Undefined for providers that key off `reference` alone.
   */
  providerCheckoutId?: string;
}

export interface VerifyTransactionResult {
  status: ProviderTransactionStatus;
  paid: boolean;
  amountMinor: number;
  currency: string;
  reference: string;
  raw: unknown;
}

/**
 * The behaviour every payment provider must implement for checkout init and
 * verification. Webhook parsing/signature validation stays provider-specific
 * because the wire formats differ too much to generalise safely.
 */
export interface PaymentAdapter {
  readonly provider: PaymentProviderName;
  initializeTransaction(
    input: InitializeTransactionInput
  ): Promise<InitializeTransactionResult>;
  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;
}

export const DEFAULT_PAYMENT_PROVIDER: PaymentProviderName = "paystack";

export function isPaymentProviderName(
  value: unknown
): value is PaymentProviderName {
  return value === "paystack" || value === "bachs";
}


export const FULFILLMENT_TYPES = [
  "LMS_ENROLLMENT",
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
  /** Provider-side session id (e.g. Bachs `chk_...`) used for verification. */
  providerCheckoutId?: string;
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