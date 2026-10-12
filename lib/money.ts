/**
 * Amount helpers for talking to payment providers.
 *
 * The application stores money as integer minor units (kobo/cents). Some
 * providers (Bachs) expect a decimal string at the currency's precision, so we
 * convert at the provider boundary only — never store floats.
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

/**
 * Convert a decimal string (`"29.00"`) to integer minor units (2900), rounding
 * half-up on the first dropped digit. Returns `NaN` for malformed input so
 * callers can reject rather than silently treat a bad amount as zero.
 */
export function decimalStringToMinor(value: string, currency: string): number {
  const decimals = currencyDecimals(currency);
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
  if (!match) return Number.NaN;

  const [, sign, whole, fracRaw = ""] = match;
  const keptFraction = fracRaw.slice(0, decimals);
  const droppedDigit = fracRaw.length > decimals ? Number(fracRaw[decimals]) : 0;

  let minor = Number(whole) * 10 ** decimals;
  if (decimals > 0) minor += Number(keptFraction.padEnd(decimals, "0") || "0");
  if (droppedDigit >= 5) minor += 1;

  return sign === "-" ? -minor : minor;
}

/** Convert integer minor units (2900) to a decimal string (`"29.00"`). */
export function minorToDecimalString(minor: number, currency: string): string {
  const decimals = currencyDecimals(currency);
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minor));

  if (decimals === 0) return `${sign}${abs}`;

  const factor = 10 ** decimals;
  const whole = Math.floor(abs / factor);
  const fraction = String(abs % factor).padStart(decimals, "0");
  return `${sign}${whole}.${fraction}`;
}
