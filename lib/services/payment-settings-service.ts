import "server-only";

import { dbConnect } from "@/lib/db";
import { env } from "@/lib/env";
import { isNigeriaRequest } from "@/lib/geo";
import { isProviderConfigured } from "@/lib/providers/payment";
import { PlatformSetting } from "@/models/PlatformSetting";
import {
  DEFAULT_PAYMENT_PROVIDER,
  isPaymentProviderSetting,
  type PaymentProviderName,
  type PaymentProviderSetting,
} from "@/types/payment";
import type {
  DisplayCurrencySetting,
  DisplaySettings,
  PlatformSettingDoc,
} from "@/types/settings";

const PAYMENT_SETTINGS_KEY = "payment";
const DISPLAY_SETTINGS_KEY = "display";

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
export async function getSelectedPaymentProvider(): Promise<PaymentProviderSetting> {
  try {
    await dbConnect();
    const doc = await PlatformSetting.findOne({
      key: PAYMENT_SETTINGS_KEY,
    })
      .lean<PlatformSettingDoc | null>()
      .exec();

    return isPaymentProviderSetting(doc?.paymentProvider)
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
  provider: PaymentProviderSetting,
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
  const selected = await getSelectedPaymentProvider();

  // An explicit Paystack/Bachs choice always wins, even when prices are shown
  // by location. "auto" is the only mode that routes by country.
  let providerToUse: PaymentProviderName;
  if (selected === "auto") {
    providerToUse = (await isNigeriaRequest()) ? "paystack" : "bachs";
  } else {
    providerToUse = selected;
  }

  if (isProviderConfigured(providerToUse)) {
    return { provider: providerToUse, requested: providerToUse, fellBack: false };
  }

  if (providerToUse === DEFAULT_PAYMENT_PROVIDER) {
    // Paystack remains the answer even when unconfigured; the order service
    // reports PAYSTACK_NOT_CONFIGURED exactly as it always has.
    return { provider: providerToUse, requested: providerToUse, fellBack: false };
  }

  return {
    provider: DEFAULT_PAYMENT_PROVIDER,
    requested: providerToUse,
    fellBack: true,
    reason: "PROVIDER_NOT_CONFIGURED",
  };
}

export async function getDisplaySettings(): Promise<DisplaySettings> {
  try {
    await dbConnect();
    const doc = await PlatformSetting.findOne({
      key: DISPLAY_SETTINGS_KEY,
    })
      .lean<PlatformSettingDoc | null>()
      .exec();

    const stored = doc?.displayCurrency;
    const displayCurrency: DisplayCurrencySetting =
      stored === "NGN" || stored === "USD" || stored === "LOCATION" ? stored : "AUTO";

    let ngnPerUsd =
      typeof doc?.ngnPerUsd === "number" && doc.ngnPerUsd > 0
        ? doc.ngnPerUsd
        : env.PRICE_DISPLAY_NGN_PER_USD;

    if (
      typeof doc?.usdPerNaira === "number" &&
      doc.usdPerNaira > 0
    ) {
      ngnPerUsd = 1 / doc.usdPerNaira;
    }

    return {
      displayCurrency,
      ngnPerUsd,
      usdPerNaira: typeof doc?.usdPerNaira === "number" ? doc.usdPerNaira : undefined,
    };
  } catch (error) {
    console.error("Failed to read display settings; using defaults", { error });
    return { displayCurrency: "AUTO", ngnPerUsd: env.PRICE_DISPLAY_NGN_PER_USD };
  }
}

export async function setDisplaySettings(
  settings: Partial<DisplaySettings>,
  updatedBy?: string
): Promise<DisplaySettings> {
  await dbConnect();
  const set: Record<string, unknown> = { updatedBy };
  if (settings.displayCurrency) {
    set.displayCurrency = settings.displayCurrency;
  }
  if (typeof settings.ngnPerUsd === "number" && settings.ngnPerUsd > 0) {
    set.ngnPerUsd = settings.ngnPerUsd;
    set.usdPerNaira = 1 / settings.ngnPerUsd;
  } else if (
    typeof settings.usdPerNaira === "number" &&
    settings.usdPerNaira > 0
  ) {
    set.usdPerNaira = settings.usdPerNaira;
    set.ngnPerUsd = 1 / settings.usdPerNaira;
  }

  await PlatformSetting.updateOne(
    { key: DISPLAY_SETTINGS_KEY },
    { $set: set },
    { upsert: true }
  );

  return getDisplaySettings();
}
