/**
 * Lightweight product analytics events.
 *
 * Funnel steps are captured server-side as orders move through checkout:
 * a page view, an order created, a payment started, and a payment that
 * settled as paid. Order-scoped events carry a deterministic `eventKey` so a
 * redelivered webhook or a retried verify can never double-count a step.
 */

export const ANALYTICS_EVENT_TYPES = [
  /** A buyer landed on the product's checkout page. */
  "CHECKOUT_VIEWED",
  /** A pending order was created for the product. */
  "ORDER_CREATED",
  /** The customer moved to the payment provider (Paystack). */
  "PAYMENT_STARTED",
  /** The payment settled and the order became PAID. */
  "PAYMENT_SUCCEEDED",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export interface AnalyticsEventDoc {
  _id: unknown;
  eventType: AnalyticsEventType;
  /**
   * Uniqueness key. Deterministic for order-scoped events
   * (`{eventType}:{orderReference}`) so duplicates are ignored; a random id for
   * page views so every view is counted.
   */
  eventKey: string;
  productId?: string;
  productType?: string;
  customerEmail?: string;
  /** Set when the visitor is signed in; intended for cohort analysis. */
  userId?: string;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}