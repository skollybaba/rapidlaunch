"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { COUNTRY_COOKIE, COUNTRY_COOKIE_MAX_AGE } from "@/lib/geo-cookie";

/** Timezones that unambiguously belong to Nigeria. */
const NIGERIA_TIMEZONES = new Set([
  "Africa/Lagos",
  "Africa/Port-Harcourt",
  "Africa/Abuja",
]);

function guessCountry(): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (NIGERIA_TIMEZONES.has(timeZone)) return "NG";

    // Other African timezones are ambiguous (and browsers there often report
    // en-US). Leave those to the server's edge/geo detection rather than
    // guessing a country and wrongly showing USD.
    if (timeZone.startsWith("Africa/")) return "";

    const locale = navigator.language || "en-US";
    const region = locale.split("-")[1];
    if (region && /^[A-Za-z]{2}$/.test(region)) {
      return region.toUpperCase();
    }
  } catch {
    // Ignore — the server will fall back to its own detection.
  }
  return "";
}

function readCountryCookie(): string | null {
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${COUNTRY_COOKIE}=`));
  return match ? match.slice(COUNTRY_COOKIE.length + 1).toUpperCase() : null;
}

/**
 * Persists a best-effort country code in a cookie so server-rendered prices
 * can follow the visitor's location even when the host provides no geo headers.
 */
export function LocationPreference() {
  const router = useRouter();

  useEffect(() => {
    const country = guessCountry();
    if (!country) return;

    // Re-set when the stored value disagrees with what the browser now says,
    // so a stale guess (e.g. from a VPN or travel) is corrected.
    if (readCountryCookie() === country) return;

    document.cookie = `${COUNTRY_COOKIE}=${country}; path=/; max-age=${COUNTRY_COOKIE_MAX_AGE}; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
