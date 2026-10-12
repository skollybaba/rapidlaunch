import type { PaymentProviderName } from "@/types/payment";

/** Well-known singleton keys for the platform settings document. */
export const PLATFORM_SETTING_KEYS = ["payment"] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

export interface PlatformSettingDoc {
  _id: unknown;
  key: string;
  paymentProvider: PaymentProviderName;
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
