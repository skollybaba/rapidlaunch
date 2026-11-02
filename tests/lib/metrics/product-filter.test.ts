import { describe, expect, it } from "vitest";

import {
  PRODUCT_FILTER_PARAM,
  productFilterFrom,
  resolveProductFilter,
} from "@/lib/metrics/product-filter";

const PRODUCT_ID = "64b000000000000000000001";

describe("resolveProductFilter", () => {
  it("returns both forms of a valid product id", () => {
    const filter = resolveProductFilter(PRODUCT_ID);

    expect(filter).not.toBeNull();
    expect(filter?.id).toBe(PRODUCT_ID);
    // Business collections query an ObjectId; AnalyticsEvent keeps a string.
    expect(String(filter?.objectId)).toBe(PRODUCT_ID);
  });

  it("trims surrounding whitespace", () => {
    expect(resolveProductFilter(`  ${PRODUCT_ID}  `)?.id).toBe(PRODUCT_ID);
  });

  it("treats a malformed id as no filter instead of throwing", () => {
    expect(resolveProductFilter("not-an-id")).toBeNull();
    expect(resolveProductFilter("")).toBeNull();
    expect(resolveProductFilter("   ")).toBeNull();
    expect(resolveProductFilter(undefined)).toBeNull();
    expect(resolveProductFilter(null)).toBeNull();
    // 24 characters, but not hexadecimal.
    expect(resolveProductFilter("zzzzzzzzzzzzzzzzzzzzzzzz")).toBeNull();
  });

  it("exposes the URL parameter name", () => {
    expect(PRODUCT_FILTER_PARAM).toBe("product");
  });
});

describe("productFilterFrom", () => {
  it("reads the product out of a metrics input object", () => {
    expect(productFilterFrom({ product: PRODUCT_ID })?.id).toBe(PRODUCT_ID);

    // The metrics services pass the whole searchParams object, which usually
    // holds a window key and no product.
    const windowOnly = { window: "30d" } as { product?: string };
    expect(productFilterFrom(windowOnly)).toBeNull();
  });

  it("ignores a string window key", () => {
    // `getRevenueMetrics("30d")` passes a bare string, which has no product.
    expect(productFilterFrom("30d")).toBeNull();
    expect(productFilterFrom(undefined)).toBeNull();
    expect(productFilterFrom(null)).toBeNull();
  });
});
