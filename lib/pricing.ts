import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { env } from "@/lib/env";
import { getDisplaySettings } from "@/lib/services/payment-settings-service";
import { formatPrice } from "@/lib/utils";

export type DisplayCurrency = "NGN" | "USD";

export const getDisplayCurrency = cache(async (): Promise<DisplayCurrency> => {
  const settings = await getDisplaySettings();
  if (settings.displayCurrency === "NGN") return "NGN";
  if (settings.displayCurrency === "USD") return "USD";
  if (settings.displayCurrency === "LOCATION" || settings.displayCurrency === "AUTO") {
    const hdrs = await headers();
    const country = (
      hdrs.get("x-vercel-ip-country") ??
      hdrs.get("cf-ipcountry") ??
      hdrs.get("cloudfront-viewer-country") ??
      ""
    ).toUpperCase();
    if (country === "NG") return "NGN";
    if (country) return "USD";
    if (/\bNG\b/i.test(hdrs.get("accept-language") ?? "")) return "NGN";
    return "USD";
  }

  const hdrs = await headers();
  const country = (
    hdrs.get("x-vercel-ip-country") ??
    hdrs.get("cf-ipcountry") ??
    hdrs.get("cloudfront-viewer-country") ??
    ""
  ).toUpperCase();
  if (country === "NG") return "NGN";
  if (country) return "USD";
  if (/\bNG\b/i.test(hdrs.get("accept-language") ?? "")) return "NGN";
  return "USD";
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
