import "server-only";

import { env } from "@/lib/env";
import { createBachsAdapter } from "@/lib/providers/bachs";
import { createPaystackAdapter } from "@/lib/providers/paystack";
import {
  isPaymentProviderName,
  type PaymentAdapter,
  type PaymentProviderName,
} from "@/types/payment";

export { isPaymentProviderName };

/** Human-readable provider name for customer/admin facing messages. */
export function paymentProviderLabel(provider: PaymentProviderName): string {
  return provider === "bachs" ? "Bachs" : "Paystack";
}

/**
 * Whether the given provider has the credentials needed to take a payment.
 * A selected provider with no key must never be used — checkout falls back to
 * Paystack instead (see `resolvePaymentProvider`).
 */
export function isProviderConfigured(provider: PaymentProviderName): boolean {
  return provider === "bachs"
    ? Boolean(env.BACHS_SECRET_KEY)
    : Boolean(env.PAYSTACK_SECRET_KEY);
}

/**
 * Build the adapter for a provider. Throws when the provider is not configured;
 * callers should check `isProviderConfigured` first so they can fall back.
 */
export function createPaymentAdapter(
  provider: PaymentProviderName
): PaymentAdapter {
  if (provider === "bachs") {
    if (!env.BACHS_SECRET_KEY) {
      throw new Error("Bachs is not configured");
    }
    return createBachsAdapter(env.BACHS_SECRET_KEY);
  }

  if (!env.PAYSTACK_SECRET_KEY) {
    throw new Error("Paystack is not configured");
  }
  return createPaystackAdapter(env.PAYSTACK_SECRET_KEY);
}
