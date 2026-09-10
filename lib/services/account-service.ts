import "server-only";

import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import { createGoogleCalendarAdapter } from "@/lib/providers/calendar";
import { createMailAdapter } from "@/lib/providers/mail";
import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import {
  getAvailabilitySlots,
  calendarConfigured,
} from "@/lib/services/slot-service";
import type { BookingDoc, BookingProvider } from "@/types/booking";
import type { FulfillmentDoc } from "@/types/payment";
import type { OrderDoc } from "@/types/order";

export const RESCHEDULE_WINDOW_MS = 24 * 60 * 60 * 1000;

export class AccountServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AccountServiceError";
    this.code = code;
    this.status = status;
  }
}

export interface AccountPurchase {
  id: string;
  orderReference: string;
  status: string;
  itemTitle: string;
  type: string;
  totalMinor: number;
  currency: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface AccountSession {
  id: string;
  orderReference: string;
  productId: string;
  productTitle: string;
  status: string;
  requestedStartTime?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  meetingUrl?: string | null;
  timezone?: string | null;
  durationMinutes?: number | null;
  isUpcoming: boolean;
  rescheduleAvailable: boolean;
}

export interface AccountRescheduleResult {
  id: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  meetingUrl?: string | null;
}

export interface AccountCourse {
  id: string;
  orderReference: string;
  title: string;
  priceMinor: number;
  currency: string;
  purchasedAt: string;
  enrollmentId?: string;
  enrollmentStatus: string;
  courseUrl?: string;
  courseId?: string;
  isBonus: boolean;
}

function toAccountCourse(
  order: OrderDoc,
  fulfillment: FulfillmentDoc | null | undefined,
  title: string,
  priceMinor: number,
  isBonus: boolean
): AccountCourse {
  const meta = (fulfillment?.metadata ?? {}) as Record<string, unknown>;
  return {
    id: String(order._id),
    orderReference: order.orderReference,
    title,
    priceMinor,
    currency: order.currency,
    purchasedAt: order.createdAt
      ? new Date(order.createdAt).toISOString()
      : new Date().toISOString(),
    enrollmentId:
      typeof meta.studentId === "string" ? meta.studentId : undefined,
    enrollmentStatus: fulfillment?.status ?? "PENDING",
    courseUrl:
      typeof meta.courseAltLink === "string" ? meta.courseAltLink : undefined,
    courseId: typeof meta.courseId === "string" ? meta.courseId : undefined,
    isBonus,
  };
}

export async function getCoursesForUser(
  userId: string
): Promise<AccountCourse[]> {
  await dbConnect();

  const orders = await Order.find({
    userId,
    status: "PAID",
    "metadata.productType": "COURSE",
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  if (!orders.length) return [];

  const orderIds = orders.map((order) => order._id);
  const fulfillments = await Fulfillment.find({
    orderId: { $in: orderIds },
    type: "CLASSROOM_ENROLLMENT",
  })
    .lean()
    .exec();

  const fulfillmentsByOrder = new Map<string, FulfillmentDoc[]>();
  for (const f of fulfillments) {
    const key = String(f.orderId);
    const list = fulfillmentsByOrder.get(key) ?? [];
    list.push(f);
    fulfillmentsByOrder.set(key, list);
  }

  const rows: AccountCourse[] = [];

  for (const order of orders as OrderDoc[]) {
    const orderFulfillments =
      fulfillmentsByOrder.get(String(order._id)) ?? [];

    const parentItemId = order.items[0]?.productId
      ? String(order.items[0].productId)
      : null;

    const parent =
      orderFulfillments.find(
        (f) => f.orderItemId && String(f.orderItemId) === parentItemId
      ) ??
      orderFulfillments.find(
        (f) => (f.metadata as Record<string, unknown>)?.bonusCourse !== true
      );

    rows.push(
      toAccountCourse(
        order,
        parent,
        order.items[0]?.titleSnapshot ?? "Course",
        order.totalMinor,
        false
      )
    );

    for (const f of orderFulfillments) {
      if ((f.metadata as Record<string, unknown>)?.bonusCourse !== true) {
        continue;
      }
      const meta = f.metadata as Record<string, unknown>;
      rows.push(
        toAccountCourse(
          order,
          f,
          typeof meta.courseName === "string"
            ? meta.courseName
            : "Bonus course",
          0,
          true
        )
      );
    }
  }

  return rows;
}

export async function getPurchasesForUser(userId: string): Promise<AccountPurchase[]> {
  await dbConnect();

  const orders = await Order.find({ userId, status: "PAID" })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return orders.map((order: OrderDoc) => ({
    id: String(order._id),
    orderReference: order.orderReference,
    status: order.status,
    itemTitle: order.items[0]?.titleSnapshot ?? "Purchase",
    type: order.items[0]?.typeSnapshot ?? "PRODUCT",
    totalMinor: order.totalMinor,
    currency: order.currency,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    createdAt: order.createdAt
      ? order.createdAt.toISOString()
      : new Date().toISOString(),
  }));
}

export async function getSessionsForUser(
  userId: string
): Promise<AccountSession[]> {
  await dbConnect();

  const orders = await Order.find({ userId }).select("_id").lean().exec();
  const orderIds = orders.map((order) => order._id);
  if (!orderIds.length) return [];

  const bookings = await Booking.find({ orderId: { $in: orderIds } })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const productIds = bookings.map((b) => b.productId);
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } })
        .select("_id title")
        .lean()
        .exec()
    : [];
  const productMap = new Map(
    products.map((p) => [String(p._id), p.title as string])
  );
  const orderMap = new Map(
    orders.map((o: OrderDoc) => [String(o._id), o.orderReference])
  );

  const now = Date.now();

  return bookings.map((booking: BookingDoc) => {
    const scheduled = booking.scheduledStartTime
      ? booking.scheduledStartTime.toISOString()
      : null;
    const scheduledMs = booking.scheduledStartTime
      ? booking.scheduledStartTime.getTime()
      : null;
    const rescheduleAvailable = Boolean(
      scheduledMs &&
        scheduledMs - now > RESCHEDULE_WINDOW_MS &&
        booking.status !== "CANCELLED" &&
        booking.status !== "FAILED"
    );
    const durationMinutes =
      booking.scheduledStartTime && booking.scheduledEndTime
        ? Math.round(
            (booking.scheduledEndTime.getTime() -
              booking.scheduledStartTime.getTime()) /
              60_000
          )
        : null;
    return {
      id: String(booking._id),
      orderReference: orderMap.get(String(booking.orderId)) ?? "",
      productId: String(booking.productId),
      productTitle: productMap.get(String(booking.productId)) ?? "Session",
      status: booking.status,
      requestedStartTime: booking.requestedStartTime
        ? booking.requestedStartTime.toISOString()
        : null,
      scheduledStartTime: scheduled,
      scheduledEndTime: booking.scheduledEndTime
        ? booking.scheduledEndTime.toISOString()
        : null,
      meetingUrl: booking.meetingUrl ?? null,
      timezone: booking.timezone ?? null,
      durationMinutes,
      isUpcoming: scheduled ? new Date(scheduled).getTime() > now : false,
      rescheduleAvailable,
    };
  });
}

export async function rescheduleSession(
  bookingId: string,
  userId: string,
  input: { startTime: string; endTime: string }
): Promise<AccountRescheduleResult> {
  await dbConnect();

  const orders = await Order.find({ userId })
    .select("_id orderReference")
    .lean()
    .exec();
  const orderIds = orders.map((order) => order._id);
  if (!orderIds.length) {
    throw new AccountServiceError("SESSION_NOT_FOUND", "Session not found.", 404);
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    orderId: { $in: orderIds },
  })
    .lean()
    .exec();
  if (!booking) {
    throw new AccountServiceError("SESSION_NOT_FOUND", "Session not found.", 404);
  }

  if (booking.status === "CANCELLED" || booking.status === "FAILED") {
    throw new AccountServiceError(
      "SESSION_NOT_ACTIVE",
      "This session can no longer be rescheduled.",
      409
    );
  }

  const originalStart = booking.scheduledStartTime
    ? booking.scheduledStartTime.getTime()
    : null;
  if (
    !originalStart ||
    originalStart - Date.now() <= RESCHEDULE_WINDOW_MS
  ) {
    throw new AccountServiceError(
      "RESCHEDULE_NOT_AVAILABLE",
      "Sessions within 24 hours of their start time cannot be rescheduled. Please contact support if you need help.",
      400
    );
  }

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.getTime() >= end.getTime()
  ) {
    throw new AccountServiceError(
      "VALIDATION_ERROR",
      "Please choose a valid time for your session.",
      400
    );
  }
  if (end.getTime() <= Date.now()) {
    throw new AccountServiceError(
      "VALIDATION_ERROR",
      "Please choose a future time for your session.",
      400
    );
  }

  const durationMinutes = booking.scheduledEndTime
    ? Math.round(
        (booking.scheduledEndTime.getTime() - (originalStart as number)) /
          60_000
      )
    : 90;
  const timezone = booking.timezone ?? env.GOOGLE_CALENDAR_TIME_ZONE;

  // Re-verify the chosen slot against live availability so a slot cannot be
  // double-booked with a client-supplied time.
  let slotConfirmed = false;
  try {
    const daysToCover = Math.min(
      Math.max(Math.ceil((start.getTime() - Date.now()) / 86_400_000) + 3, 1),
      30
    );
    const { slots } = await getAvailabilitySlots({
      days: daysToCover,
      durationMinutes,
      timezone,
    });
    slotConfirmed = slots.some(
      (slot) => new Date(slot.startTime).getTime() === start.getTime()
    );
  } catch (error) {
    console.error("Availability check failed while rescheduling", {
      bookingId,
      error,
    });
    throw new AccountServiceError(
      "SLOT_UNAVAILABLE",
      "We could not confirm that time is still available. Please try again.",
      503
    );
  }
  if (!slotConfirmed) {
    throw new AccountServiceError(
      "SLOT_UNAVAILABLE",
      "That time is no longer available. Please pick another slot.",
      409
    );
  }

  let meetingUrl = booking.meetingUrl ?? "";
  let providerEventUri = booking.providerEventUri ?? "";
  let providerBookingUri = booking.providerBookingUri ?? "";
  let provider: BookingProvider = booking.provider;

  const orderDoc = await Order.findById(booking.orderId)
    .select("items.titleSnapshot")
    .lean()
    .exec();
  const itemTitle =
    Array.isArray(orderDoc?.items) && orderDoc.items[0]
      ? ((orderDoc.items[0] as { titleSnapshot?: string }).titleSnapshot ??
        "your session")
      : "your session";
  const orderReference = orders.find(
    (o: OrderDoc) => String(o._id) === String(booking.orderId)
  )?.orderReference;

  // For sessions with a Google Calendar event, move the event + Meet link to
  // the new time. Manual bookings simply record the new time.
  if (booking.provider === "google_calendar" && calendarConfigured()) {
    const adapter = createGoogleCalendarAdapter({
      clientId: env.GOOGLE_CLIENT_ID as string,
      clientSecret: env.GOOGLE_CLIENT_SECRET as string,
      refreshToken: env.GOOGLE_REFRESH_TOKEN as string,
      calendarId: env.GOOGLE_CALENDAR_OWNER_EMAIL as string,
      organizerName: env.GOOGLE_CALENDAR_ORGANIZER_NAME,
      timezone: env.GOOGLE_CALENDAR_TIME_ZONE,
      workStart: env.GOOGLE_CALENDAR_WORK_START,
      workEnd: env.GOOGLE_CALENDAR_WORK_END,
    });

    let event;
    try {
      event = await adapter.createMeetEvent({
        calendarId: env.GOOGLE_CALENDAR_OWNER_EMAIL as string,
        organizerName: env.GOOGLE_CALENDAR_ORGANIZER_NAME,
        summary: itemTitle,
        description: [
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
          .join("\n"),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        timezone,
        attendeeEmail: booking.customerEmail,
        attendeeName: booking.customerName,
      });
    } catch (error) {
      console.error("Meet event creation failed while rescheduling", {
        bookingId,
        error,
      });
      throw new AccountServiceError(
        "RESCHEDULE_FAILED",
        "We could not reschedule your session right now. Please try again or contact support.",
        502
      );
    }

    meetingUrl = event.hangoutLink ?? meetingUrl;
    providerEventUri = event.id;
    providerBookingUri = event.htmlLink;
    provider = "google_calendar";

    if (booking.providerEventUri) {
      try {
        await adapter.cancelEvent(booking.providerEventUri);
      } catch (error) {
        console.error("Old calendar event could not be cancelled", {
          bookingId,
          eventId: booking.providerEventUri,
          error,
        });
      }
    }
  }

  const rescheduledAt = new Date();
  await Booking.updateOne(
    { _id: bookingId },
    {
      $set: {
        scheduledStartTime: start,
        scheduledEndTime: end,
        meetingUrl,
        providerEventUri,
        providerBookingUri,
        provider,
        status: "CONFIRMED",
        lastRescheduledAt: rescheduledAt,
        lastReminderSentAt: null,
        reminders: [],
        bookedAt: booking.bookedAt ?? rescheduledAt,
        lastError: null,
      },
    }
  ).exec();

  await Fulfillment.findOneAndUpdate(
    { orderId: booking.orderId, type: "BOOKING" },
    {
      $set: {
        metadata: {
          meetingUrl,
          calendarEventId: providerEventUri,
          calendarEventLink: providerBookingUri,
          scheduledStartTime: start.toISOString(),
          scheduledEndTime: end.toISOString(),
        },
      },
    }
  ).exec();

  if (booking.customerEmail) {
    try {
      const mailAdapter = createMailAdapter();
      await mailAdapter.sendTemplateEmail({
        templateKey: "booking_rescheduled",
        to: booking.customerEmail,
        variables: {
          customerName: booking.customerName ?? "",
          itemTitle,
          orderReference: orderReference ?? "",
          scheduledAt: start.toLocaleString("en-GB", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: timezone,
          }),
          meetingUrl,
          appUrl: env.NEXT_PUBLIC_APP_URL,
        },
      });
    } catch (error) {
      console.error("Reschedule confirmation email failed", {
        bookingId,
        error,
      });
    }
  }

  return {
    id: String(booking._id),
    scheduledStartTime: start.toISOString(),
    scheduledEndTime: end.toISOString(),
    meetingUrl: meetingUrl || null,
  };
}