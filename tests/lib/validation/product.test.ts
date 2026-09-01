import { describe, expect, it } from "vitest";

import {
  productInputSchema,
  productListQuerySchema,
} from "@/lib/validation/product";

const baseInput = {
  type: "BOOK" as const,
  slug: "valid-slug",
  title: "Valid Product",
  status: "DRAFT" as const,
  priceMinor: 0,
};

describe("productInputSchema", () => {
  it("accepts a minimal draft", () => {
    expect(productInputSchema.parse(baseInput).status).toBe("DRAFT");
  });

  it("rejects an invalid slug", () => {
    expect(() =>
      productInputSchema.parse({ ...baseInput, slug: "Bad Slug!" })
    ).toThrow();
  });

  it("rejects an unknown type", () => {
    expect(() =>
      productInputSchema.parse({ ...baseInput, type: "GADGET" })
    ).toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() =>
      productInputSchema.parse({ ...baseInput, scheme: "zen" })
    ).toThrow();
  });

  it("requires a positive price for a published product", () => {
    const result = productInputSchema.safeParse({
      ...baseInput,
      status: "PUBLISHED",
      fulfillmentMode: "DOWNLOAD",
      priceMinor: 0,
      bookDetails: { deliveryMode: "DIGITAL_DOWNLOAD" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain(
        "priceMinor"
      );
    }
  });

  it("allows a zero price for a quote-based published MVP", () => {
    const result = productInputSchema.safeParse({
      ...baseInput,
      type: "MVP_SERVICE",
      status: "PUBLISHED",
      fulfillmentMode: "MANUAL",
      priceMinor: 0,
      mvpServiceDetails: { quoteMode: true, scope: "Discovery and MVP build" },
    });
    expect(result.success).toBe(true);
  });

  it("requires a scope for a published non-quote MVP", () => {
    const result = productInputSchema.safeParse({
      ...baseInput,
      type: "MVP_SERVICE",
      status: "PUBLISHED",
      fulfillmentMode: "MANUAL",
      priceMinor: 1_000,
      mvpServiceDetails: { quoteMode: false },
    });
    expect(result.success).toBe(false);
  });

  it("allows a zero price for an externally fulfilled published product", () => {
    const result = productInputSchema.safeParse({
      ...baseInput,
      status: "PUBLISHED",
      fulfillmentMode: "EXTERNAL",
      priceMinor: 0,
      bookDetails: { deliveryMode: "EXTERNAL" },
    });
    expect(result.success).toBe(true);
  });

  it("requires a fulfillment mode on published products", () => {
    const result = productInputSchema.safeParse({
      ...baseInput,
      status: "PUBLISHED",
      priceMinor: 1_000,
    });
    expect(result.success).toBe(false);
  });

  it("requires a classroom course id on published automatic courses", () => {
    const result = productInputSchema.safeParse({
      ...baseInput,
      type: "COURSE",
      status: "PUBLISHED",
      fulfillmentMode: "CLASSROOM",
      priceMinor: 1_000,
      courseDetails: { enrollmentMode: "AUTOMATIC" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain(
        "courseDetails.classroomCourseId"
      );
    }
  });

  it("accepts a published course with manual enrollment and no classroom id", () => {
    const result = productInputSchema.safeParse({
      ...baseInput,
      type: "COURSE",
      status: "PUBLISHED",
      fulfillmentMode: "MANUAL",
      priceMinor: 1_000,
      courseDetails: { enrollmentMode: "MANUAL" },
    });
    expect(result.success).toBe(true);
  });

  it("requires a delivery mode on published books", () => {
    const result = productInputSchema.safeParse({
      ...baseInput,
      status: "PUBLISHED",
      fulfillmentMode: "DOWNLOAD",
      priceMinor: 1_000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain(
        "bookDetails.deliveryMode"
      );
    }
  });

  it("requires a booking mode on published consultations", () => {
    const result = productInputSchema.safeParse({
      ...baseInput,
      type: "CONSULTATION",
      status: "PUBLISHED",
      fulfillmentMode: "SCHEDULER",
      priceMinor: 1_000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join("."))).toContain(
        "consultationDetails.bookingMode"
      );
    }
  });
});

describe("productListQuerySchema", () => {
  it("defaults the limit to 50", () => {
    expect(productListQuerySchema.parse({}).limit).toBe(50);
  });

  it("coerces string limits", () => {
    expect(productListQuerySchema.parse({ limit: "12" }).limit).toBe(12);
  });

  it("rejects a zero limit", () => {
    expect(() => productListQuerySchema.parse({ limit: 0 })).toThrow();
  });

  it("rejects an invalid type", () => {
    expect(() => productListQuerySchema.parse({ type: "COURSE_" })).toThrow();
  });

  it("accepts a known product type", () => {
    expect(productListQuerySchema.parse({ type: "COURSE" }).type).toBe(
      "COURSE"
    );
  });
});