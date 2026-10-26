import "server-only";

import { cookies, headers } from "next/headers";

import { COUNTRY_COOKIE } from "@/lib/geo-cookie";

/**
 * Determine the visitor's two-letter country code.
 *
 * Order of confidence:
 * 1. An explicit `rl_country` cookie set by the browser (timezone/locale based).
 * 2. A CDN edge header (Vercel, Cloudflare, CloudFront).
 * 3. The `accept-language` header.
 *
 * Returns an empty string when nothing is known.
 */
export async function resolveCountryCode(): Promise<string> {
  const cookieStore = await cookies();
  const cookieCountry = (cookieStore.get(COUNTRY_COOKIE)?.value ?? "").toUpperCase();
  if (/^[A-Z]{2}$/.test(cookieCountry)) {
    return cookieCountry;
  }

  const hdrs = await headers();

  const edgeCountry = (
    hdrs.get("x-vercel-ip-country") ??
    hdrs.get("cf-ipcountry") ??
    hdrs.get("cloudfront-viewer-country") ??
    ""
  ).toUpperCase();
  if (/^[A-Z]{2}$/.test(edgeCountry)) {
    return edgeCountry;
  }

  // Language is a weak signal and `en-US` is the default almost everywhere, so
  // only use it to positively identify Nigeria, never to infer another country.
  const acceptLanguage = hdrs.get("accept-language") ?? "";
  if (/\bng\b/i.test(acceptLanguage)) {
    return "NG";
  }

  return "";
}

/**
 * Whether this request should be treated as coming from Nigeria.
 *
 * Defaults to `true` (Naira / Paystack) when the country is unknown, because
 * the business operates primarily in Nigeria. Only a positively detected
 * non-Nigerian country is treated as international.
 */
export async function isNigeriaRequest(): Promise<boolean> {
  const country = await resolveCountryCode();
  if (!country) return true;
  return country === "NG";
}
