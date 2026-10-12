import "server-only";

import { dbConnect } from "@/lib/db";
import { isProviderConfigured } from "@/lib/providers/payment";
import { PlatformSetting } from "@/models/PlatformSetting";
import {
  DEFAULT_PAYMENT_PROVIDER,
  isPaymentProviderName,
  type PaymentProviderName,
} from "@/types/payment";
import type { PlatformSettingDoc } from "@/types/settings";

const PAYMENT_SETTINGS_KEY = "payment";

export interface ResolvedPaymentProvider {
  /** Provider checkout should actually use. */
  provider: PaymentProviderName;
  /** Provider the admin selected, before any fallback. */
  requested: PaymentProviderName;
  fellBack: boolean;
  reason?: "PROVIDER_NOT_CONFIGURED";
}

/**
 * Read the admin-selected payment provider. Falls back to Paystack when the
 * setting is missing or the database is unreachable so a settings outage never
 * takes checkout down.
 */
export async function getSelectedPaymentProvider(): Promise<PaymentProviderName> {
  try {
    await dbConnect();
    const doc = await PlatformSetting.findOne({
      key: PAYMENT_SETTINGS_KEY,
    })
      .lean<PlatformSettingDoc | null>()
      .exec();

    return isPaymentProviderName(doc?.paymentProvider)
      ? doc.paymentProvider
      : DEFAULT_PAYMENT_PROVIDER;
  } catch (error) {
    console.error("Failed to read payment settings; defaulting to Paystack", {
      error,
    });
    return DEFAULT_PAYMENT_PROVIDER;
  }
}

export async function setPaymentProvider(
  provider: PaymentProviderName,
  updatedBy?: string
): Promise<void> {
  await dbConnect();
  await PlatformSetting.updateOne(
    { key: PAYMENT_SETTINGS_KEY },
    { $set: { paymentProvider: provider, updatedBy } },
    { upsert: true }
  );
}

/**
 * Decide which provider checkout should use right now.
 *
 * The admin choice is respected only when that provider has credentials. If the
 * selected provider has no key (most likely Bachs before its secret is
 * configured) we fall back to Paystack rather than blocking the sale.
 */
export async function resolvePaymentProvider(): Promise<ResolvedPaymentProvider> {
  const requested = await getSelectedPaymentProvider();

  if (isProviderConfigured(requested)) {
    return { provider: requested, requested, fellBack: false };
  }

  if (requested === DEFAULT_PAYMENT_PROVIDER) {
    // Paystack remains the answer even when unconfigured; the order service
    // reports PAYSTACK_NOT_CONFIGURED exactly as it always has.
    return { provider: requested, requested, fellBack: false };
  }

  return {
    provider: DEFAULT_PAYMENT_PROVIDER,
    requested,
    fellBack: true,
    reason: "PROVIDER_NOT_CONFIGURED",
  };
}
