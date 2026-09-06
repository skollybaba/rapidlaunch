import "server-only";

import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import { Booking } from "@/models/Booking";
import { Product } from "@/models/Product";
import { createMailAdapter } from "@/lib/providers/mail";
import type {
  BookingReminderPoint,
  BookingReminderRecord,
} from "@/types/booking";

export interface BookingReminderOutcome {
  bookingId: string;
  point: BookingReminderPoint;
  sentTo: string;
}

export interface DispatchRemindersResult {
  dispatched: BookingReminderOutcome[];
  skipped: number;
}

const REMINDER_WINDOW_MS: Record<BookingReminderPoint, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

export async function dispatchBookingReminders(): Promise<DispatchRemindersResult> {
  await dbConnect();

  const now = Date.now();

  const bookings = await Booking.find({
    status: "CONFIRMED",
    scheduledStartTime: { $gt: new Date(now) },
    dismissedAt: null,
  })
    .select({
      _id: 1,
      customerEmail: 1,
      customerName: 1,
      timezone: 1,
      scheduledStartTime: 1,
      meetingUrl: 1,
      productId: 1,
      reminders: 1,
    })
    .lean()
    .exec();

  const adapter = createMailAdapter();
  const dispatched: BookingReminderOutcome[] = [];
  let skipped = 0;

  for (const booking of bookings) {
    const scheduled = booking.scheduledStartTime?.getTime();
    if (!scheduled) {
      skipped += 1;
      continue;
    }
    // Never remind after the session has already started.
    if (now >= scheduled) {
      skipped += 1;
      continue;
    }

    const product = booking.productId
      ? await Product.findById(booking.productId)
          .select({ title: 1 })
          .lean()
          .exec()
      : null;
    const itemTitle = product?.title ?? "your session";
    const customerEmail = booking.customerEmail;

    for (const point of ["24h", "1h"] as BookingReminderPoint[]) {
      if (alreadySent(booking.reminders, point)) continue;

      const windowMs = REMINDER_WINDOW_MS[point];
      const windowStart = scheduled - windowMs;
      // Fire once the threshold is crossed, and keep firing (retry of the
      // same point stays harmless thanks to the idempotency gate) until the
      // session starts.
      if (now < windowStart) continue;
      if (customerEmail) {
        try {
          await adapter.sendTemplateEmail({
            templateKey: "booking_reminder",
            to: customerEmail,
            variables: {
              itemTitle,
              customerName: booking.customerName ?? "",
              meetingUrl: booking.meetingUrl ?? "",
              scheduledAt: new Date(scheduled).toLocaleString("en-GB", {
                timeZone: booking.timezone || "Africa/Lagos",
                dateStyle: "full",
                timeStyle: "short",
              }),
              windowHours: point.replace("h", ""),
            },
          });
          await Booking.updateOne(
            { _id: booking._id },
            { $push: { reminders: { point, sentAt: new Date() } } }
          );
          dispatched.push({
            bookingId: String(booking._id),
            point,
            sentTo: customerEmail,
          });
        } catch (error) {
          skipped += 1;
          console.error(
            `Booking reminder (${point}) failed for ${customerEmail}`,
            { error }
          );
        }
      } else {
        skipped += 1;
      }
    }
  }

  return { dispatched, skipped };
}

function alreadySent(
  reminders: BookingReminderRecord[] | undefined,
  point: BookingReminderPoint
): boolean {
  return Boolean(reminders?.some((entry) => entry.point === point));
}

export function isReminderSecret(token: string): boolean {
  if (!env.REMINDER_CRON_SECRET) return false;
  return token === env.REMINDER_CRON_SECRET;
}