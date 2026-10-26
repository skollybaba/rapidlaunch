import "server-only";

import { cache } from "react";

import { env } from "@/lib/env";
import { isNigeriaRequest } from "@/lib/geo";
import { getDisplaySettings } from "@/lib/services/payment-settings-service";
import { formatPrice } from "@/lib/utils";

export type DisplayCurrency = "NGN" | "USD";

export const getDisplayCurrency = cache(async (): Promise<DisplayCurrency> => {
  const settings = await getDisplaySettings();

  if (settings.displayCurrency === "NGN") return "NGN";
  if (settings.displayCurrency === "USD") return "USD";

  // "LOCATION" (and the legacy "AUTO") follow the visitor's country:
  // Nigeria -> NGN, anywhere else -> USD. Unknown defaults to NGN.
  return (await isNigeriaRequest()) ? "NGN" : "USD";
});

export interface DisplayPriceResult {
  amountMinor: number;
  currency: string;
  label: string;
  converted: boolean;
}

export async function displayPrice(
  amountMinor: number,
  baseCurrency: string,
  displayCurrency: DisplayCurrency
): Promise<DisplayPriceResult> {
  if (displayCurrency === baseCurrency) {
    return {
      amountMinor,
      currency: displayCurrency,
      label: formatPrice(amountMinor, displayCurrency),
      converted: false,
    };
  }
  if (displayCurrency === "USD" && baseCurrency === "NGN") {
    const settings = await getDisplaySettings();
    const rate = settings.ngnPerUsd || env.PRICE_DISPLAY_NGN_PER_USD;
    const convertedMinor = Math.round(amountMinor / rate);
    return {
      amountMinor: convertedMinor,
      currency: "USD",
      label: formatPrice(convertedMinor, "USD"),
      converted: true,
    };
  }
  return {
    amountMinor,
    currency: baseCurrency,
    label: formatPrice(amountMinor, baseCurrency),
    converted: false,
  };
}
