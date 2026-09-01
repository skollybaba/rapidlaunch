import type { ProductType } from "@/types/product";
import type { PaymentStatus } from "@/types/payment";

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItemDoc {
  productId: unknown;
  titleSnapshot: string;
  typeSnapshot: ProductType;
  unitPriceMinor: number;
  quantity: number;
}

export interface OrderDoc {
  _id: unknown;
  orderReference: string;
  userId?: unknown | null;
  customerEmail: string;
  status: OrderStatus;
  items: OrderItemDoc[];
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: string;
  metadata: Record<string, unknown>;
  paymentId?: unknown | null;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderPublicSummary {
  id: string;
  orderReference: string;
  status: OrderStatus;
  itemTitle: string;
  totalMinor: number;
  currency: string;
  paymentStatus?: PaymentStatus;
  paidAt?: string | null;
}