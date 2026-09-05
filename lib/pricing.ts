import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { env } from "@/lib/env";
import { formatPrice } from "@/lib/utils";

export type DisplayCurrency = "NGN" | "USD";

export const getDisplayCurrency = cache(async (): Promise<DisplayCurrency> => {
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

export function displayPrice(
  amountMinor: number,
  baseCurrency: string,
  displayCurrency: DisplayCurrency
): DisplayPriceResult {
  if (displayCurrency === baseCurrency) {
    return {
      amountMinor,
      currency: displayCurrency,
      label: formatPrice(amountMinor, displayCurrency),
      converted: false,
    };
  }
  if (displayCurrency === "USD" && baseCurrency === "NGN") {
    const rate = env.PRICE_DISPLAY_NGN_PER_USD;
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