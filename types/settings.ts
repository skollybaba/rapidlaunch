import type { PaymentProviderName } from "@/types/payment";

/** Well-known singleton keys for the platform settings document. */
export const PLATFORM_SETTING_KEYS = ["payment", "display"] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

export type DisplayCurrencySetting = "NGN" | "USD" | "AUTO" | "LOCATION";

export interface PlatformSettingDoc {
  _id: unknown;
  key: string;
  paymentProvider?: PaymentProviderName;
  displayCurrency?: DisplayCurrencySetting;
  /** Naira per 1 USD (e.g. 1600 means 1 USD = ₦1600). */
  ngnPerUsd?: number;
  /** Dollars per 1 Naira (e.g. 0.000625). Alternative to ngnPerUsd. */
  usdPerNaira?: number;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentSettings {
  /** The provider the owner selected in the back office. */
  provider: PaymentProviderName;
  /** The provider credentials that actually resolve (after fallback). */
  effectiveProvider: PaymentProviderName;
  bachsConfigured: boolean;
  paystackConfigured: boolean;
  /** True when the selected provider has no key and Paystack is used instead. */
  fellBack: boolean;
}

export interface DisplaySettings {
  displayCurrency: DisplayCurrencySetting;
  ngnPerUsd: number;
  usdPerNaira?: number;
}
