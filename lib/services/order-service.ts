import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import {
  createCheckoutSessionSchema,
  initializePaymentSchema,
  type CreateCheckoutSessionInput,
} from "@/lib/validation/order";
import {
  paystackChargeDataSchema,
  paystackWebhookPayloadSchema,
} from "@/lib/validation/payment";
import {
  createPaystackAdapter,
  PaystackProviderError,
  type VerifyTransactionResult,
} from "@/lib/providers/paystack";
import { createMailAdapter } from "@/lib/providers/mail";
import {
  createGoogleCalendarAdapter,
  GoogleCalendarProviderError,
} from "@/lib/providers/calendar";
import { formatPrice } from "@/lib/utils";
import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { PaymentEvent } from "@/models/PaymentEvent";
import { Product } from "@/models/Product";
import type { FulfillmentType, PaymentDoc } from "@/types/payment";
import type { OrderDoc, OrderPublicSummary } from "@/types/order";

export class OrderServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "OrderServiceError";
    this.code = code;
    this.status = status;
  }
}

type LeanDoc<T> = T & { __v?: number };

export function generateOrderReference(): string {
  return `QL-${randomBytes(8).toString("base64url").toUpperCase()}`;
}

export function generateProviderReference(): string {
  return `QL-PAY-${randomBytes(8).toString("base64url").toUpperCase()}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PAYSTACK_VERIFY_MAX_ATTEMPTS = 4;
const PAYSTACK_VERIFY_RETRY_BASE_DELAY_MS = 1200;

function webhookEventKey(event: string, payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "id" in payload &&
    typeof (payload as { id: unknown }).id !== "undefined"
  ) {
    return `${event}:${String((payload as { id: unknown }).id)}`;
  }
  const hash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  return `${event}:hash:${hash}`;
}

function fulfillmentTypeForOrder(order: {
  metadata: Record<string, unknown>;
  type?: unknown;
}): FulfillmentType {
  const mode = order.metadata.productFulfillmentMode;
  const type = order.metadata.productType;

  switch (mode) {
    case "CLASSROOM":
      return "CLASSROOM_ENROLLMENT";
    case "DOWNLOAD":
      return "BOOK_DOWNLOAD";
    case "SCHEDULER":
      return "BOOKING";
    case "MANUAL":
      if (type === "CONSULTATION") return "BOOKING";
      if (type === "MVP_SERVICE") return "MVP_SERVICE";
      return "BOOK_DOWNLOAD";
    default:
      return "BOOK_DOWNLOAD";
  }
}

type PaystackFilter = Record<string, unknown>;

function paystackPaymentFilter(extra: Record<string, unknown>) {
  return {
    provider: "paystack",
    ...extra,
  } as PaystackFilter as unknown as Parameters<typeof Payment.findOne>[0];
}

export async function createCheckoutSession(
  input: unknown
): Promise<{ orderReference: string; itemTitle: string; bookingId?: string }> {
  const parsed = createCheckoutSessionSchema.parse(input) as CreateCheckoutSessionInput;

  await dbConnect();

  const product = await Product.findOne({
    _id: parsed.productId,
    status: "PUBLISHED",
  } as unknown as Parameters<typeof Product.findOne>[0])
    .lean()
    .exec();

  if (!product) {
    throw new OrderServiceError(
      "PRODUCT_NOT_AVAILABLE",
      "This product is not available for purchase",
      404
    );
  }

  if (product.fulfillmentMode === "EXTERNAL") {
    throw new OrderServiceError(
      "EXTERNAL_PRODUCT",
      "This product is bought on an external store and cannot be checked out here",
      400
    );
  }

  if (product.priceMinor <= 0) {
    throw new OrderServiceError(
      "PRODUCT_NOT_PAYABLE",
      "This product does not have a payable price",
      400
    );
  }

  const unitPriceMinor = product.priceMinor;
  const orderReference = generateOrderReference();

  const order = await Order.create({
    orderReference,
    customerEmail: parsed.customerEmail,
    userId: (parsed.metadata?.userId as string) ?? null,
    items: [
      {
        productId: product._id,
        titleSnapshot: product.title,
        typeSnapshot: product.type,
        unitPriceMinor,
        quantity: 1,
      },
    ],
    subtotalMinor: unitPriceMinor,
    discountMinor: 0,
    totalMinor: unitPriceMinor,
    currency: product.currency,
    metadata: {
      ...(parsed.metadata ?? {}),
      productId: String(product._id),
      productType: product.type,
      productFulfillmentMode: product.fulfillmentMode,
      productSlug: product.slug,
      productDurationMinutes:
        product.type === "CONSULTATION"
          ? product.consultationDetails?.durationMinutes ?? 90
          : undefined,
    },
  });

  if (product.type === "CONSULTATION" && parsed.session) {
    const booking = await Booking.create({
      orderId: order._id,
      productId: product._id,
      customerEmail: parsed.customerEmail,
      customerName: parsed.session.customerName,
      answers: {
        whatYouAreBuilding: parsed.session.whatYouAreBuilding,
        currentStage: parsed.session.currentStage,
        helpNeeded: parsed.session.helpNeeded,
      },
      timezone: parsed.session.timezone,
      requestedStartTime: parsed.session.requestedStartTime
        ? new Date(parsed.session.requestedStartTime)
        : null,
      provider: "google_calendar",
      schedulingUrl: product.consultationDetails?.schedulerUrl,
      status: "PENDING",
      attempts: 0,
    });
    return {
      orderReference: order.orderReference,
      itemTitle: product.title,
      bookingId: String(booking._id),
    };
  }

  return {
    orderReference: order.orderReference,
    itemTitle: product.title,
  };
}

export async function initializeCheckoutPayment(input: unknown): Promise<{
  authorizationUrl: string;
  accessCode: string;
  providerReference: string;
}> {
  const parsed = initializePaymentSchema.parse(input);

  await dbConnect();

  const order = await Order.findOne({
    orderReference: parsed.orderReference,
  })
    .lean()
    .exec();

  if (!order) {
    throw new OrderServiceError("ORDER_NOT_FOUND", "Order not found", 404);
  }

  if (order.status !== "PENDING") {
    throw new OrderServiceError(
      "ORDER_NOT_PAYABLE",
      "This order is no longer pending payment",
      409
    );
  }

  const providerReference = generateProviderReference();

  const payment = await Payment.create({
    orderId: order._id,
    provider: "paystack",
    providerReference,
    status: "PENDING",
    amountMinor: order.totalMinor,
    currency: order.currency,
  });

  const secretKey = env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          status: "INITIALIZATION_FAILED",
          errorMessage: "Paystack is not configured",
        },
      }
    );
    throw new OrderServiceError(
      "PAYSTACK_NOT_CONFIGURED",
      "Secure payment is not configured yet. Please contact us to complete your purchase.",
      503
    );
  }

  const adapter = createPaystackAdapter(secretKey);

  try {
    const result = await adapter.initializeTransaction({
      amountMinor: order.totalMinor,
      currency: order.currency,
      email: order.customerEmail,
      reference: providerReference,
      callbackUrl: `${env.NEXT_PUBLIC_APP_URL}/payment/callback?reference=${providerReference}`,
      metadata: {
        orderId: String(order._id),
        orderReference: order.orderReference,
        productId: String(order.items[0]?.productId ?? ""),
      },
    });

    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          status: "CREATED",
          authorizationUrl: result.authorizationUrl,
          accessCode: result.accessCode,
        },
      }
    );

    return {
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      providerReference,
    };
  } catch (error) {
    const message =
      error instanceof PaystackProviderError
        ? error.message
        : "Could not initialize payment";
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { status: "INITIALIZATION_FAILED", errorMessage: message } }
    );
    if (error instanceof PaystackProviderError && error.retryable) {
      throw new OrderServiceError(
        "PAYMENT_INIT_RETRYABLE",
        "Paystack could not be reached. Please try again.",
        503
      );
    }
    throw new OrderServiceError("PAYMENT_INIT_FAILED", message, 502);
  }
}

export async function verifyCheckoutPayment(
  reference: string | string[]
): Promise<OrderPublicSummary & { paymentStatus: string; discrepancy: boolean }> {
  const ref = Array.isArray(reference) ? reference[0] : reference;
  await dbConnect();

  const payment = await Payment.findOne(
    paystackPaymentFilter({ providerReference: ref })
  )
    .lean()
    .exec();

  if (!payment) {
    throw new OrderServiceError("PAYMENT_NOT_FOUND", "Payment not found", 404);
  }

  if (payment.status === "PAID") {
    return settleVerifiedPayment(payment, null);
  }

  const secretKey = env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new OrderServiceError(
      "PAYSTACK_NOT_CONFIGURED",
      "Secure payment verification is not configured yet.",
      503
    );
  }

  const adapter = createPaystackAdapter(secretKey);

  let result: VerifyTransactionResult | undefined;
  let lastRetryableError: unknown;

  for (let attempt = 1; attempt <= PAYSTACK_VERIFY_MAX_ATTEMPTS; attempt++) {
    try {
      result = await adapter.verifyTransaction(ref);
      lastRetryableError = undefined;
      if (result.paid || result.status === "failed" || result.status === "abandoned") {
        break;
      }
      if (attempt === PAYSTACK_VERIFY_MAX_ATTEMPTS) {
        break;
      }
    } catch (error) {
      if (!(error instanceof PaystackProviderError) || !error.retryable) {
        throw error;
      }
      lastRetryableError = error;
      if (attempt === PAYSTACK_VERIFY_MAX_ATTEMPTS) {
        break;
      }
    }
    await sleep(PAYSTACK_VERIFY_RETRY_BASE_DELAY_MS * attempt);
  }

  if (!result) {
    if (lastRetryableError) {
      throw lastRetryableError;
    }
    throw new OrderServiceError(
      "PAYMENT_VERIFY_FAILED",
      "Payment could not be verified right now.",
      502
    );
  }

  if (!result.paid) {
    if (result.status === "abandoned" || result.status === "failed") {
      await Payment.updateOne(
        { _id: payment._id },
        {
          $set: {
            status: result.status === "abandoned" ? "ABANDONED" : "FAILED",
            verificationPayload: result.raw,
          },
        }
      );
    }
    return {
      id: String(payment.orderId),
      orderReference: "",
      status: "PENDING",
      itemTitle: "",
      totalMinor: payment.amountMinor,
      currency: payment.currency,
      paymentStatus: result.status === "abandoned" ? "ABANDONED" : result.status === "failed" ? "FAILED" : "PENDING",
      discrepancy: false,
    };
  }

  return settleVerifiedPayment(payment, result);
}

async function settleVerifiedPayment(
  payment: LeanDoc<PaymentDoc>,
  verified: VerifyTransactionResult | null
): Promise<OrderPublicSummary & { paymentStatus: string; discrepancy: boolean }> {
  const order = await Order.findById(payment.orderId).lean().exec();

  if (!order) {
    throw new OrderServiceError("ORDER_NOT_FOUND", "Order not found", 404);
  }

  if (payment.status === "PAID" && order.status === "PAID") {
    return {
      id: String(order._id),
      orderReference: order.orderReference,
      status: "PAID",
      itemTitle: order.items[0]?.titleSnapshot ?? "",
      totalMinor: order.totalMinor,
      currency: order.currency,
      paymentStatus: "PAID",
      discrepancy: false,
      paidAt: order.paidAt?.toISOString() ??
        null,
    };
  }

  if (verified) {
    const matches =
      verified.amountMinor === payment.amountMinor &&
      verified.currency === payment.currency;

    if (!matches) {
      await Payment.updateOne(
        { _id: payment._id },
        {
          $set: {
            status: "SUSPICIOUS",
            verificationPayload: verified.raw,
            errorMessage: "Verified amount or currency did not match the order",
          },
        }
      );
      return {
        id: String(order._id),
        orderReference: order.orderReference,
        status: order.status,
        itemTitle: order.items[0]?.titleSnapshot ?? "",
        totalMinor: order.totalMinor,
        currency: order.currency,
        paymentStatus: "SUSPICIOUS",
        discrepancy: true,
      };
    }
  }

  const now = new Date();

  await Payment.updateOne(
    { _id: payment._id },
    {
      $set: {
        status: "PAID",
        paidAt: now,
        verificationPayload: verified?.raw ?? payment.verificationPayload,
        errorMessage: undefined,
      },
    }
  );

  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        status: "PAID",
        paidAt: now,
        paymentId: payment._id,
      },
    }
  );

  await createFulfillmentIfMissing(order);

  await bookConsultationIfPending(order);

  await sendPaymentConfirmationEmail(order);

  return {
    id: String(order._id),
    orderReference: order.orderReference,
    status: "PAID",
    itemTitle: order.items[0]?.titleSnapshot ?? "",
    totalMinor: order.totalMinor,
    currency: order.currency,
    paymentStatus: "PAID",
    discrepancy: false,
    paidAt: now.toISOString(),
  };
}

async function createFulfillmentIfMissing(order: LeanDoc<OrderDoc>) {
  const type = fulfillmentTypeForOrder(order);
  const firstItemId = order.items[0]?.productId
    ? String(order.items[0].productId)
    : null;

  await Fulfillment.findOneAndUpdate(
    { orderId: order._id, orderItemId: firstItemId, type },
    {
      $setOnInsert: {
        status: "PENDING",
        type,
        orderId: order._id,
        orderItemId: firstItemId,
        attempts: 0,
        metadata: {},
        lastError: null,
        fulfilledAt: null,
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  ).exec();
}

async function bookConsultationIfPending(order: LeanDoc<OrderDoc>) {
  if (order.metadata?.productType !== "CONSULTATION") return;

  const booking = await Booking.findOne({ orderId: order._id })
    .lean()
    .exec();
  if (!booking || booking.status !== "PENDING") return;
  if (!booking.requestedStartTime) return;

  const calendarId = env.GOOGLE_CALENDAR_OWNER_EMAIL;
  if (
    !calendarId ||
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REFRESH_TOKEN
  ) {
    await Booking.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: "FAILED",
          lastError: "GOOGLE_CALENDAR_NOT_CONFIGURED",
          attempts: booking.attempts + 1,
        },
      }
    );
    return;
  }

  const durationMinutes =
    (order.metadata?.productDurationMinutes as number | undefined) ?? 90;
  const timezone = booking.timezone ?? "Africa/Lagos";
  const startTime = new Date(booking.requestedStartTime);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

  const adapter = createGoogleCalendarAdapter({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    refreshToken: env.GOOGLE_REFRESH_TOKEN,
    calendarId,
    organizerName: env.GOOGLE_CALENDAR_ORGANIZER_NAME,
    timezone: env.GOOGLE_CALENDAR_TIME_ZONE,
    workStart: env.GOOGLE_CALENDAR_WORK_START,
    workEnd: env.GOOGLE_CALENDAR_WORK_END,
  });

  const description = [
    booking.answers?.whatYouAreBuilding
      ? `Building: ${booking.answers.whatYouAreBuilding}`
      : null,
    booking.answers?.currentStage
      ? `Stage: ${booking.answers.currentStage}`
      : null,
    booking.answers?.helpNeeded
      ? `Help needed: ${booking.answers.helpNeeded}`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  try {
    const event = await adapter.createMeetEvent({
      calendarId,
      organizerName: env.GOOGLE_CALENDAR_ORGANIZER_NAME,
      summary: order.items[0]?.titleSnapshot ?? "Strategy session",
      description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timezone,
      attendeeEmail: booking.customerEmail,
      attendeeName: booking.customerName,
    });

    await Booking.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: "CONFIRMED",
          providerBookingUri: event.htmlLink,
          providerEventUri: event.id,
          meetingUrl: event.hangoutLink ?? "",
          scheduledStartTime: new Date(event.startTime),
          scheduledEndTime: new Date(event.endTime),
          attempts: booking.attempts + 1,
          bookedAt: new Date(),
          lastError: null,
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof GoogleCalendarProviderError
        ? error.code
        : "GOOGLE_CALENDAR_BOOKING_FAILED";
    console.error("Google Calendar booking failed for order", order.orderReference, {
      error,
    });
    await Booking.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: "FAILED",
          lastError: message,
          attempts: booking.attempts + 1,
        },
      }
    );
  }
}

function orderNextStepText(order: LeanDoc<OrderDoc>): string {
  const mode = order.metadata?.productFulfillmentMode;
  const type = order.metadata?.productType;

  if (mode === "CLASSROOM") {
    return "Your course enrollment is being processed. You will receive a separate email with access to your Google Classroom course.";
  }
  if (mode === "DOWNLOAD") {
    return "Your download links are being prepared and will be sent to you shortly.";
  }
  if (mode === "SCHEDULER") {
    return "We will send you a link to schedule your session shortly.";
  }
  if (type === "CONSULTATION") {
    return "We will send you a link to book your consultation shortly.";
  }
  if (type === "MVP_SERVICE") {
    return "Our team will reach out to start your MVP project. Expect an onboarding message soon.";
  }
  return "We are preparing the next steps for your purchase and will email you shortly.";
}

async function sendPaymentConfirmationEmail(order: LeanDoc<OrderDoc>) {
  const adapter = createMailAdapter();
  const itemTitle = order.items[0]?.titleSnapshot ?? "your purchase";
  const email = order.customerEmail;

  if (!email) return;

  const booking = await Booking.findOne({ orderId: order._id }).lean().exec();

  try {
    await adapter.sendTemplateEmail({
      templateKey: "payment_successful",
      to: email,
      variables: {
        itemTitle,
        orderReference: order.orderReference,
        amount: formatPrice(order.totalMinor, order.currency),
        customerName: booking?.customerName ?? "",
        nextStep: orderNextStepText(order),
        meetingUrl: booking?.meetingUrl ?? "",
        bookingUrl:
          booking?.providerBookingUri ??
          booking?.schedulingUrl ??
          "",
        scheduledAt: booking?.scheduledStartTime
          ? new Date(booking.scheduledStartTime).toLocaleString("en-GB", {
              timeZone: booking.timezone || undefined,
              dateStyle: "full",
              timeStyle: "short",
            })
          : "",
        timezone: booking?.timezone ?? "",
        bookingPending: booking && booking.status === "PENDING" ? "true" : "false",
      },
    });
  } catch (error) {
    // Email failure must not undo a verified payment.
    console.error("Payment confirmation email failed to send", email, {
      error,
    });
  }
}

export async function getOrderByReference(
  orderReference: string
): Promise<OrderPublicSummary> {
  await dbConnect();

  const order = await Order.findOne({ orderReference }).lean().exec();

  if (!order) {
    throw new OrderServiceError("ORDER_NOT_FOUND", "Order not found", 404);
  }

  const payment = await Payment.findOne({
    orderId: order._id,
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return {
    id: String(order._id),
    orderReference: order.orderReference,
    status: order.status,
    itemTitle: order.items[0]?.titleSnapshot ?? "",
    totalMinor: order.totalMinor,
    currency: order.currency,
    paymentStatus: payment?.status ?? "PENDING",
    paidAt: order.paidAt?.toISOString() ?? null,
  };
}

export interface WebhookProcessingResult {
  accepted: boolean;
  duplicate?: boolean;
  reason?: string;
  requestId: string;
}

export async function processPaystackWebhook(
  rawBody: string,
  signature: string
): Promise<WebhookProcessingResult> {
  const requestId = randomUUID();

  if (!rawBody) {
    return { accepted: false, reason: "EMPTY_BODY", requestId };
  }

  const signingSecrets = [env.PAYSTACK_SECRET_KEY, env.PAYSTACK_WEBHOOK_SECRET].filter(
    (secret): secret is string => Boolean(secret)
  );

  if (signingSecrets.length === 0) {
    return { accepted: false, reason: "PAYSTACK_NOT_CONFIGURED", requestId };
  }

  const signatureValid = signingSecrets.some((secret) =>
    createPaystackAdapter(secret).validateWebhookSignature(rawBody, signature)
  );

  if (!signatureValid) {
    return { accepted: false, reason: "INVALID_SIGNATURE", requestId };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { accepted: false, reason: "INVALID_JSON", requestId };
  }

  const parsed = paystackWebhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { accepted: false, reason: "INVALID_PAYLOAD", requestId };
  }

  const { event } = parsed.data;
  const eventKey = webhookEventKey(event, parsed.data.data);

  await dbConnect();

  const existing = await PaymentEvent.findOne({
    provider: "paystack",
    providerEventKey: eventKey,
  })
    .lean()
    .exec();

  if (existing) {
    return { accepted: true, duplicate: true, requestId };
  }

  await PaymentEvent.create({
    provider: "paystack",
    providerEventKey: eventKey,
    eventType: event,
    signatureValid: true,
    rawPayload: payload,
    receivedAt: new Date(),
    processingStatus: "PROCESSING",
  });

  try {
    if (event === "charge.success") {
      const charge = paystackChargeDataSchema.safeParse(parsed.data.data);
      if (charge.success) {
        const payment = await Payment.findOne(
          paystackPaymentFilter({ providerReference: charge.data.reference })
        )
          .lean()
          .exec();

        if (payment) {
          await settleVerifiedPayment(payment, {
            status: "success",
            paid: true,
            amountMinor: charge.data.amount,
            currency: charge.data.currency,
            reference: charge.data.reference,
            raw: parsed.data.data,
          });
        }
      }
      await PaymentEvent.updateOne(
        { provider: "paystack", providerEventKey: eventKey },
        { $set: { processingStatus: "PROCESSED", processedAt: new Date() } }
      );
    } else {
      await PaymentEvent.updateOne(
        { provider: "paystack", providerEventKey: eventKey },
        { $set: { processingStatus: "IGNORED", processedAt: new Date() } }
      );
    }
  } catch (error) {
    await PaymentEvent.updateOne(
      { provider: "paystack", providerEventKey: eventKey },
      {
        $set: {
          processingStatus: "FAILED",
          processedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      }
    );
  }

  return { accepted: true, duplicate: false, requestId };
}