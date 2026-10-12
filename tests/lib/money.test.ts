import { describe, expect, it } from "vitest";

import { decimalStringToMinor, minorToDecimalString } from "@/lib/money";

describe("minorToDecimalString", () => {
  it("formats minor units at two decimals", () => {
    expect(minorToDecimalString(2_900, "NGN")).toBe("29.00");
    expect(minorToDecimalString(5_000_000, "NGN")).toBe("50000.00");
    expect(minorToDecimalString(5, "USD")).toBe("0.05");
  });

  it("omits decimals for zero-decimal currencies", () => {
    expect(minorToDecimalString(2_900, "JPY")).toBe("2900");
    expect(minorToDecimalString(50, "JPY")).toBe("50");
  });
});

describe("decimalStringToMinor", () => {
  it("parses decimal strings to minor units", () => {
    expect(decimalStringToMinor("29.00", "NGN")).toBe(2_900);
    expect(decimalStringToMinor("50000.00", "NGN")).toBe(5_000_000);
    expect(decimalStringToMinor("0.05", "USD")).toBe(5);
  });

  it("rounds half-up on the first dropped digit", () => {
    expect(decimalStringToMinor("1.005", "NGN")).toBe(101);
    expect(decimalStringToMinor("1.004", "NGN")).toBe(100);
  });

  it("handles zero-decimal currencies", () => {
    expect(decimalStringToMinor("2900", "JPY")).toBe(2_900);
  });

  it("round-trips with minorToDecimalString", () => {
    const minor = 123_456;
    expect(decimalStringToMinor(minorToDecimalString(minor, "NGN"), "NGN")).toBe(
      minor
    );
  });

  it("returns NaN for malformed input", () => {
    expect(Number.isNaN(decimalStringToMinor("abc", "NGN"))).toBe(true);
    expect(Number.isNaN(decimalStringToMinor("", "NGN"))).toBe(true);
  });
});
