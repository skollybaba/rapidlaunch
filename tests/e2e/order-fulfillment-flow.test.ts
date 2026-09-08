import { createHmac } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mailAdapter, classroomAdapter, calendarAdapter, whatsAppNotifier } =
  vi.hoisted(() => ({
    mailAdapter: {
      sendTemplateEmail: vi.fn().mockResolvedValue({}),
      sendEmail: vi.fn().mockResolvedValue({}),
      sendTestEmail: vi.fn().mockResolvedValue({}),
    },
    classroomAdapter: {
      listConfiguredCourses: vi.fn().mockResolvedValue([]),
      getCourse: vi.fn().mockResolvedValue({
        id: "CRS_BONUS",
        name: "Bonus Classroom Course",
        alternateLink: "https://classroom.google.com/c/CRS_BONUS",
      }),
      enrollStudent: vi.fn().mockResolvedValue({
        studentId: "STU_E2E",
        alreadyEnrolled: false,
        errorCategory: null,
        providerResponse: {},
      }),
      checkEnrollment: vi.fn().mockResolvedValue(true),
    },
    calendarAdapter: {
      createMeetEvent: vi.fn().mockResolvedValue({
        id: "EVT_MEET_1",
        htmlLink: "https://calendar.google.com/event/EVT_MEET_1",
        hangoutLink: "https://meet.google.com/abc-def-ghi",
        startTime: "2026-09-15T10:00:00.000Z",
        endTime: "2026-09-15T11:30:00.000Z",
      }),
    },
    whatsAppNotifier: vi.fn().mockResolvedValue({ sent: 1, skipped: 0 }),
  }));

// Real models + real local MongoDB, only the external providers are mocked.
vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: vi.fn(() => mailAdapter),
}));

vi.mock("@/lib/providers/classroom", () => ({
  createClassroomAdapter: vi.fn(() => classroomAdapter),
}));

vi.mock("@/lib/providers/calendar", () => ({
  createGoogleCalendarAdapter: vi.fn(() => calendarAdapter),
  GoogleCalendarProviderError: class GoogleCalendarProviderError extends Error {},
}));

vi.mock("@/lib/services/whatsapp-service", () => ({
  notifyAdminsOrderPaid: whatsAppNotifier,
}));

import { dbConnect } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { PaymentEvent } from "@/models/PaymentEvent";
import { Product } from "@/models/Product";
import {
  processPaystackWebhook,
  processPaystackWebhookEvent,
} from "@/lib/services/order-service";
import {
  dispatchFulfillmentRetries,
  retryOrderFulfillment,
} from "@/lib/services/fulfillment-service";

const SECRET = "sk_test_unit_dummy";

let mongoAvailable = true;

try {
  await dbConnect();
} catch {
  mongoAvailable = false;
}

function sign(body: string) {
  return createHmac("sha512", SECRET).update(body, "utf8").digest("hex");
}

function webhookBody(reference: string, id: number) {
  return JSON.stringify({
    event: "charge.success",
    data: {
      id,
      reference,
      status: "success",
      amount: 1_250_000,
      currency: "NGN",
    },
  });
}

describe.skipIf(!mongoAvailable)("end-to-end fulfillment flow against local MongoDB", () => {
  beforeAll(async () => {
    if (!mongoAvailable) return;
    await dbConnect();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    for (const Model of [
      PaymentEvent,
      Payment,
      Fulfillment,
      Booking,
      Order,
      Product,
    ] as const) {
      await (Model as typeof Order).deleteMany({});
    }
  });

  afterAll(async () => {
    if (!mongoAvailable) return;
    await PaymentEvent.deleteMany({});
    await Payment.deleteMany({});
    await Fulfillment.deleteMany({});
    await Booking.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
  });

  async function seedCourseBundle() {
    const parent = await Product.create({
      type: "COURSE",
      slug: "e2e-parent-course",
      title: "AI Product Strategy",
      status: "PUBLISHED",
      priceMinor: 1_250_000,
      currency: "NGN",
      fulfillmentMode: "CLASSROOM",
      courseDetails: { classroomCourseId: "CRS_PARENT" },
    });
    const bonus = await Product.create({
      type: "COURSE",
      slug: "e2e-bonus-course",
      title: "Bonus Course",
      status: "PUBLISHED",
      priceMinor: 0,
      currency: "NGN",
      fulfillmentMode: "CLASSROOM",
      courseDetails: { classroomCourseId: "CRS_BONUS" },
    });
    const order = await Order.create({
      orderReference: "QL-E2E-BUNDLE",
      customerEmail: "buyer@example.com",
      status: "PENDING",
      items: [
        {
          productId: parent._id,
          titleSnapshot: "AI Product Strategy",
          typeSnapshot: "COURSE",
          unitPriceMinor: 1_250_000,
          quantity: 1,
        },
      ],
      subtotalMinor: 1_250_000,
      discountMinor: 0,
      totalMinor: 1_250_000,
      currency: "NGN",
      metadata: {
        productType: "COURSE",
        productFulfillmentMode: "CLASSROOM",
        classroomCourseId: "CRS_PARENT",
        bundleCourseIds: [bonus._id],
      },
    });
    const payment = await Payment.create({
      orderId: order._id,
      provider: "paystack",
      providerReference: "QL-PAY-BUNDLE",
      status: "CREATED",
      amountMinor: 1_250_000,
      currency: "NGN",
    });
    return { parent, bonus, order, payment };
  }

  it("acknowledges a webhook instantly, then settles the whole bundle in the background step", async () => {
    const { order } = await seedCourseBundle();

    const afterAck = await Order.findById(String(order._id)).lean().exec();
    expect(afterAck?.status).toBe("PENDING");

    const body = webhookBody("QL-PAY-BUNDLE", 101);
    const result = await processPaystackWebhook(body, sign(body));
    expect(result).toMatchObject({ accepted: true, duplicate: false });

    const stillPending = await Order.findById(String(order._id)).lean().exec();
    expect(stillPending?.status).toBe("PENDING");

    await processPaystackWebhookEvent(result);

    const settled = await Order.findById(String(order._id)).lean().exec();
    expect(settled?.status).toBe("PAID");
    expect(
      (settled?.metadata as Record<string, unknown>)?.confirmationEmailSentAt
    ).toBeTruthy();

    const fulfillments = await Fulfillment.find({
      orderId: order._id,
      type: "CLASSROOM_ENROLLMENT",
    })
      .lean()
      .exec();
    expect(fulfillments).toHaveLength(2);
    for (const f of fulfillments) {
      expect(f.status).toBe("FULFILLED");
      expect(f.lastError).toBeNull();
    }
    const bonusRow = fulfillments.find(
      (f) => (f.metadata as Record<string, unknown>)?.bonusCourse === true
    );
    expect(bonusRow?.metadata.courseId).toBe("CRS_BONUS");

    const templates = mailAdapter.sendTemplateEmail.mock.calls.map(
      ([input]) => input.templateKey
    );
    expect(templates.filter((t) => t === "payment_successful")).toHaveLength(1);
    expect(templates.filter((t) => t === "course_access_fulfilled")).toHaveLength(2);

    const event = await PaymentEvent.findOne({ providerEventKey: "charge.success:101" })
      .lean()
      .exec();
    expect(event?.processingStatus).toBe("PROCESSED");
  });

  it("treats an already-enrolled bonus course as fulfilled instead of action required", async () => {
    const { order } = await seedCourseBundle();
    vi.mocked(classroomAdapter.enrollStudent).mockImplementation(
      ({ courseId }) =>
        Promise.resolve({
          studentId: null,
          alreadyEnrolled: true,
          errorCategory: courseId === "CRS_BONUS" ? "ALREADY_ENROLLED" : null,
          providerResponse: null,
        })
    );

    const body = webhookBody("QL-PAY-BUNDLE", 102);
    await processPaystackWebhookEvent(await processPaystackWebhook(body, sign(body)));

    const fulfillments = await Fulfillment.find({
      orderId: order._id,
      type: "CLASSROOM_ENROLLMENT",
    })
      .lean()
      .exec();
    expect(fulfillments).toHaveLength(2);
    for (const f of fulfillments) {
      expect(f.status).toBe("FULFILLED");
    }
    const accessEmailCalls = mailAdapter.sendTemplateEmail.mock.calls.filter(
      ([input]) => input.templateKey === "course_access_fulfilled"
    );
    expect(accessEmailCalls).toHaveLength(2);
  });

  it("confirms a consultation once, sends the confirmation email, and never duplicates the Meet invite", async () => {
    const product = await Product.create({
      type: "CONSULTATION",
      slug: "e2e-consultation",
      title: "Strategy Session",
      status: "PUBLISHED",
      priceMinor: 250_000,
      currency: "NGN",
      fulfillmentMode: "SCHEDULER",
      consultationDetails: { durationMinutes: 90 },
    });
    const order = await Order.create({
      orderReference: "QL-E2E-CONSULT",
      customerEmail: "buyer@example.com",
      status: "PAID",
      items: [
        {
          productId: product._id,
          titleSnapshot: "Strategy Session",
          typeSnapshot: "CONSULTATION",
          unitPriceMinor: 250_000,
          quantity: 1,
        },
      ],
      subtotalMinor: 250_000,
      discountMinor: 0,
      totalMinor: 250_000,
      currency: "NGN",
      metadata: { productType: "CONSULTATION", productDurationMinutes: 90 },
      paidAt: new Date(),
    });
    await Booking.create({
      orderId: order._id,
      productId: product._id,
      customerEmail: "buyer@example.com",
      customerName: "Buyer Person",
      requestedStartTime: new Date("2026-09-15T10:00:00.000Z"),
      timezone: "Africa/Lagos",
      provider: "google_calendar",
      status: "PENDING",
      attempts: 0,
    });

    const first = await retryOrderFulfillment(String(order._id));
    expect(first.bookingConfirmed).toBe(true);
    expect(first.confirmationEmailSent).toBe(true);

    const booking = await Booking.findOne({ orderId: order._id }).lean().exec();
    expect(booking?.status).toBe("CONFIRMED");
    expect(booking?.meetingUrl).toBe("https://meet.google.com/abc-def-ghi");
    expect(vi.mocked(calendarAdapter.createMeetEvent)).toHaveBeenCalledTimes(1);

    // Admin clicks "Confirm session" again: nothing new may be created.
    const second = await retryOrderFulfillment(String(order._id));
    expect(second.bookingConfirmed).toBe(true);
    expect(vi.mocked(calendarAdapter.createMeetEvent)).toHaveBeenCalledTimes(1);
    expect(
      mailAdapter.sendTemplateEmail.mock.calls.filter(
        ([input]) => input.templateKey === "payment_successful"
      )
    ).toHaveLength(1);

    // Simulate a frozen runner: event exists but CONFIRMED was never persisted.
    await Booking.updateOne(
      { _id: booking?._id },
      {
        $set: {
          status: "PROCESSING",
          updatedAt: new Date(Date.now() - 5 * 60_000),
        },
      }
    );
    const recovered = await retryOrderFulfillment(String(order._id));
    expect(recovered.bookingConfirmed).toBe(true);
    const recoveredBooking = await Booking.findById(booking?._id).lean().exec();
    expect(recoveredBooking?.status).toBe("CONFIRMED");
    expect(vi.mocked(calendarAdapter.createMeetEvent)).toHaveBeenCalledTimes(1);
    expect(
      mailAdapter.sendTemplateEmail.mock.calls.filter(
        ([input]) => input.templateKey === "payment_successful"
      )
    ).toHaveLength(1);
  });

  it("recovers a silent PENDING bonus fulfillment via the fulfillment sweeper", async () => {
    const { order, bonus } = await seedCourseBundle();

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: "PAID",
          paidAt: new Date(),
          metadata: {
            productType: "COURSE",
            productFulfillmentMode: "CLASSROOM",
            classroomCourseId: "CRS_PARENT",
            bundleCourseIds: [bonus._id],
            confirmationEmailSentAt: new Date(),
            lastFulfillmentRetryAt: new Date(),
          },
        },
      }
    );
    // The parent is done, but the bonus row silently stayed PENDING (the prod
    // bug). Email flag + retry timestamp are both fresh, so only the stuck-row
    // scan should pick this order up.
    await Fulfillment.create({
      orderId: order._id,
      orderItemId: order.items[0].productId,
      type: "CLASSROOM_ENROLLMENT",
      status: "FULFILLED",
      attempts: 1,
      fulfilledAt: new Date(),
      metadata: { courseId: "CRS_PARENT" },
    });
    await Fulfillment.create({
      orderId: order._id,
      orderItemId: bonus._id,
      type: "CLASSROOM_ENROLLMENT",
      status: "PENDING",
      attempts: 0,
      metadata: { bonusCourse: true },
    });

    const dispatch = await dispatchFulfillmentRetries();

    expect(
      dispatch.outcomes.some((o) => o.orderId === String(order._id))
    ).toBe(true);

    const bonusRow = await Fulfillment.findOne({
      orderId: order._id,
      orderItemId: bonus._id,
    })
      .lean()
      .exec();
    expect(bonusRow?.status).toBe("FULFILLED");
    expect(classroomAdapter.enrollStudent).toHaveBeenCalled();
  });
});