import { describe, expect, it } from "vitest";

import {
  couponInputSchema,
  couponPreviewSchema,
  couponToggleSchema,
} from "@/lib/validation/coupon";

describe("couponInputSchema", () => {
  it("accepts a valid coupon with defaults", () => {
    const parsed = couponInputSchema.parse({
      code: "launch50",
      discountPercent: 50,
    });
    expect(parsed.code).toBe("LAUNCH50");
    expect(parsed.appliesTo).toBe("ALL");
    expect(parsed.active).toBe(false);
    expect(parsed.startsAt).toBeNull();
    expect(parsed.endsAt).toBeNull();
    expect(parsed.maxUses).toBeUndefined();
  });

  it("parses datetime windows into Date objects", () => {
    const parsed = couponInputSchema.parse({
      code: "FLASH20",
      discountPercent: 20,
      startsAt: "2026-10-01T00:00:00.000Z",
      endsAt: "2026-10-31T23:59:59.000Z",
    });
    expect(parsed.startsAt).toBeInstanceOf(Date);
    expect(parsed.endsAt).toBeInstanceOf(Date);
  });

  it("accepts 1% and 99% discounts", () => {
    expect(couponInputSchema.parse({ code: "MIN1", discountPercent: 1 }).discountPercent).toBe(1);
    expect(couponInputSchema.parse({ code: "MAX99", discountPercent: 99 }).discountPercent).toBe(99);
  });

  it("rejects a blank or malformed code", () => {
    expect(() =>
      couponInputSchema.parse({ code: "", discountPercent: 10 })
    ).toThrow();
    expect(() =>
      couponInputSchema.parse({ code: "BAD CODE!", discountPercent: 10 })
    ).toThrow();
    expect(() =>
      couponInputSchema.parse({ code: "A", discountPercent: 10 })
    ).toThrow();
  });

  it("rejects discounts outside 1-99 and non-integers", () => {
    expect(() =>
      couponInputSchema.parse({ code: "ZERO", discountPercent: 0 })
    ).toThrow();
    expect(() =>
      couponInputSchema.parse({ code: "HUNDRED", discountPercent: 100 })
    ).toThrow();
    expect(() =>
      couponInputSchema.parse({ code: "TWENTY", discountPercent: 20.5 })
    ).toThrow();
  });

  it("rejects usage limits below one", () => {
    expect(() =>
      couponInputSchema.parse({ code: "LIMIT", discountPercent: 10, maxUses: 0 })
    ).toThrow();
  });

  it("rejects an end date before the start date", () => {
    expect(() =>
      couponInputSchema.parse({
        code: "FLIP",
        discountPercent: 10,
        startsAt: "2026-10-31T23:59:59.000Z",
        endsAt: "2026-10-01T00:00:00.000Z",
      })
    ).toThrow(/after start date/i);
  });

  it("rejects unknown keys", () => {
    expect(() =>
      couponInputSchema.parse({
        code: "LAUNCH",
        discountPercent: 10,
        hacked: true,
      })
    ).toThrow();
  });
});

describe("couponToggleSchema", () => {
  it("accepts an active toggle", () => {
    expect(couponToggleSchema.parse({ active: true })).toEqual({ active: true });
  });

  it("rejects extra keys", () => {
    expect(() => couponToggleSchema.parse({ active: true, code: "X" })).toThrow();
  });
});

describe("couponPreviewSchema", () => {
  it("uppercases and trims the code", () => {
    const parsed = couponPreviewSchema.parse({
      couponCode: "  launch50 ",
      productId: "PROD1",
    });
    expect(parsed.couponCode).toBe("LAUNCH50");
  });

  it("rejects a missing product", () => {
    expect(() =>
      couponPreviewSchema.parse({ couponCode: "LAUNCH50" })
    ).toThrow();
  });
});