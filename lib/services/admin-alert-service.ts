import "server-only";

import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import { createMailAdapter } from "@/lib/providers/mail";
import { Order } from "@/models/Order";
import { formatPrice } from "@/lib/utils";
import type { PaymentDoc } from "@/types/payment";
import type { ProductType } from "@/types/product";
import type { OrderDoc } from "@/types/order";

type LeanDoc<T> = T & { __v?: number };

export interface AdminSaleAlertResult {
  sent: number;
  skipped: number;
}

export type AdminSaleAlertVariables = {
  itemTitle: string;
  itemKind: string;
  orderReference: string;
  amount: string;
  customerEmail: string;
  paidAt: string;
  paymentReference: string;
  otherItems: string;
  adminOrdersUrl: string;
};

/**
 * Product types the owner wants to hear about by email: a course purchase or a
 * one-on-one session (the admin labels CONSULTATION as "Session"). Books and
 * MVP services are deliberately excluded.
 */
const SALE_ALERT_PRODUCT_TYPES: readonly ProductType[] = ["COURSE", "CONSULTATION"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * True when any item in the order is a course or a session.
 */
export function isCourseOrSessionOrder(order: Pick<OrderDoc, "items">): boolean {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.some((item) =>
    SALE_ALERT_PRODUCT_TYPES.includes(item.typeSnapshot)
  );
}

/**
 * Recipients of the back-office sale alert, read from `SALES_ALERT_EMAILS`.
 * Comma-separated, deduplicated, invalid entries dropped.
 */
export function getSalesAlertRecipients(): string[] {
  const entries = (env.SALES_ALERT_EMAILS ?? "").split(",");
  const seen = new Set<string>();
  const recipients: string[] = [];

  for (const entry of entries) {
    const email = entry.trim().toLowerCase();
    if (!email || seen.has(email) || !EMAIL_PATTERN.test(email)) continue;
    seen.add(email);
    recipients.push(email);
  }

  return recipients;
}

/** Human label for the dashboard alert: "Course" or "Session". */
function orderKind(items: OrderDoc["items"]): string {
  const types = new Set(items.map((item) => item.typeSnapshot));
  if (types.has("COURSE")) return "Course";
  if (types.has("CONSULTATION")) return "Session";
  return "Sale";
}

/**
 * Paid time in the operating time zone, falling back to an ISO timestamp so a
 * misconfigured zone can never cost the owner a sale alert.
 */
function formatPaidAt(paidAt: Date | null | undefined): string {
  if (!paidAt) return "";
  try {
    return new Date(paidAt).toLocaleString("en-GB", {
      timeZone: env.GOOGLE_CALENDAR_TIME_ZONE,
      dateStyle: "full",
      timeStyle: "short",
    });
  } catch {
    return new Date(paidAt).toISOString();
  }
}

export function buildSaleAlertVariables(
  order: LeanDoc<OrderDoc>,
  payment?: LeanDoc<PaymentDoc> | null
): AdminSaleAlertVariables {
  const items = Array.isArray(order.items) ? order.items : [];
  const first = items[0];

  return {
    itemTitle: first?.titleSnapshot ?? "A product",
    itemKind: orderKind(items),
    orderReference: order.orderReference,
    amount: formatPrice(order.totalMinor, order.currency),
    customerEmail: order.customerEmail,
    paidAt: formatPaidAt(order.paidAt),
    paymentReference: payment?.providerReference ?? "",
    otherItems: items
      .slice(1)
      .map((item) => item.titleSnapshot)
      .filter(Boolean)
      .join(", "),
    adminOrdersUrl: `${env.NEXT_PUBLIC_APP_URL}/admin/orders`,
  };
}

/**
 * Emails the back office that a course or session was paid for.
 *
 * Best effort by contract: callers treat a failure as non-fatal so a verified
 * payment is never blocked or reversed by an alert. Idempotent per order — a
 * claim on `metadata.saleAlertNotifiedAt` is taken first, so the callback and
 * the webhook settling the same order cannot both send, and the claim is
 * released when nothing went out so a later settle can retry.
 */
export async function notifyAdminsOfSale(
  order: LeanDoc<OrderDoc>,
  payment?: LeanDoc<PaymentDoc> | null
): Promise<AdminSaleAlertResult> {
  if (!isCourseOrSessionOrder(order)) {
    return { sent: 0, skipped: 0 };
  }

  const recipients = getSalesAlertRecipients();
  if (recipients.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  await dbConnect();

  const claimed = await Order.updateOne(
    {
      _id: order._id,
      "metadata.saleAlertNotifiedAt": { $exists: false },
    },
    { $set: { "metadata.saleAlertNotifiedAt": new Date() } }
  );
  if (!claimed || claimed.matchedCount !== 1) {
    return { sent: 0, skipped: 1 };
  }

  const variables = buildSaleAlertVariables(order, payment);
  const adapter = createMailAdapter();

  let sent = 0;
  for (const to of recipients) {
    try {
      await adapter.sendTemplateEmail({
        templateKey: "admin_order_alert",
        to,
        variables,
      });
      sent += 1;
    } catch (error) {
      console.error("Admin sale alert email failed for order", order.orderReference, {
        to,
        error,
      });
    }
  }

  if (sent === 0) {
    // Nothing went out: release the claim so a later settle can retry.
    await Order.updateOne(
      { _id: order._id },
      { $unset: { "metadata.saleAlertNotifiedAt": "" } }
    );
    console.error("Admin sale alert not sent for order", order.orderReference, {
      recipients: recipients.length,
    });
  }

  return { sent, skipped: recipients.length - sent };
}
