import "server-only";

import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import {
  createWhatsAppAdapter,
  normalizeWhatsAppNumber,
} from "@/lib/providers/whatsapp";
import { formatPrice } from "@/lib/utils";
import { Order } from "@/models/Order";
import type { PaymentDoc } from "@/types/payment";
import type { OrderDoc } from "@/types/order";

type LeanDoc<T> = T & { __v?: number };

export interface WhatsAppNotificationResult {
  sent: number;
  skipped: number;
}

export function getWhatsAppAdminNumbers(): string[] {
  const entries = (env.WHATSAPP_ADMIN_NUMBERS ?? "").split(",");
  const seen = new Set<string>();
  const numbers: string[] = [];

  for (const entry of entries) {
    const normalized = normalizeWhatsAppNumber(entry);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      numbers.push(normalized);
    }
  }
  return numbers;
}

export function buildPaidOrderMessage(
  order: LeanDoc<OrderDoc>,
  payment?: LeanDoc<PaymentDoc> | null
): string {
  const itemTitle = order.items[0]?.titleSnapshot ?? "your product";
  const lines = [
    "New paid order on Rapid Launch",
    "",
    itemTitle,
    `Order reference: ${order.orderReference}`,
    `Amount: ${formatPrice(order.totalMinor, order.currency)}`,
    `Customer email: ${order.customerEmail}`,
  ];
  if (payment?.providerReference) {
    lines.push(`Payment reference: ${payment.providerReference}`);
  }
  return lines.join("\n");
}

export async function notifyAdminsOrderPaid(
  order: LeanDoc<OrderDoc>,
  payment?: LeanDoc<PaymentDoc> | null
): Promise<WhatsAppNotificationResult> {
  await dbConnect();

  const numbers = getWhatsAppAdminNumbers();
  if (numbers.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  if (order.metadata?.whatsappNotifiedAt) {
    return { sent: 0, skipped: 0 };
  }

  const adapter = createWhatsAppAdapter();
  const text = buildPaidOrderMessage(order, payment);

  let sent = 0;
  let skipped = 0;
  for (const to of numbers) {
    try {
      await adapter.sendText({ to, text });
      sent += 1;
    } catch (error) {
      skipped += 1;
      console.error(
        "WhatsApp admin notification failed for order",
        order.orderReference,
        { to, error }
      );
    }
  }

  if (sent > 0) {
    await Order.updateOne(
      { _id: order._id },
      { $set: { "metadata.whatsappNotifiedAt": new Date() } }
    );
  }

  return { sent, skipped };
}