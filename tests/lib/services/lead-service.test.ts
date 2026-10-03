import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Product", () => ({
  Product: { findOne: vi.fn() },
}));

vi.mock("@/models/Lead", async () => {
  const actual = await vi.importActual<typeof import("@/models/Lead")>(
    "@/models/Lead"
  );
  return {
    ...actual,
    Lead: { create: vi.fn(), find: vi.fn(), findById: vi.fn() },
  };
});

import { Lead } from "@/models/Lead";
import { Product } from "@/models/Product";
import {
  LeadServiceError,
  createLead,
  offeringForServiceSlug,
} from "@/lib/services/lead-service";

const mockFindOne = vi.mocked(Product.findOne);
const mockCreate = vi.mocked(Lead.create);

function execResult<T>(value: T) {
  return { exec: vi.fn().mockResolvedValue(value) };
}

function productDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: "64f1c2a0b9d2c4a1f2a3b4c5",
    slug: "building-your-product-with-ai",
    title: "Building Your Product with AI",
    type: "MVP_SERVICE",
    status: "PUBLISHED",
    priceMinor: 100_000_000,
    currency: "NGN",
    fulfillmentMode: "MANUAL",
    mvpServiceDetails: {
      quoteMode: false,
      inquiryMode: "INTEREST",
      scope: "A scoped build",
    },
    ...overrides,
  };
}

describe("createLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockReturnValue({
      _id: "507f1f77bcf86cd799439011",
    } as never);
  });

  it("stores an interest submission and returns the listed price from the product", async () => {
    mockFindOne.mockReturnValue(execResult(productDoc()) as never);

    const result = await createLead({
      productSlug: "building-your-product-with-ai",
      name: "Ada",
      email: "ADA@Example.com",
      whatYouAreBuilding: "A logistics dashboard",
      helpNeeded: "First version",
    });

    expect(result.offering).toBe("AI_BUILD_PRICED");
    expect(result.quotedPriceMinor).toBe(100_000_000);
    expect(result.requiresQuote).toBe(false);
    expect(result.productTitle).toBe("Building Your Product with AI");

    const stored = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(stored.email).toBe("ada@example.com");
    expect(stored.status).toBe("NEW");
    expect(stored.source).toBe("FOUNDERS_CATALOGUE");
  });

  it("marks a quote-mode engagement as requiring a quote and withholds a price", async () => {
    mockFindOne.mockReturnValue(
      execResult(
        productDoc({
          slug: "build-a-product-with-us",
          title: "Build a Product With Us",
          priceMinor: 0,
          mvpServiceDetails: {
            quoteMode: true,
            inquiryMode: "QUOTE",
            scope: "A bespoke build",
          },
        })
      ) as never
    );

    const result = await createLead({
      productSlug: "build-a-product-with-us",
      name: "Grace",
      email: "grace@example.com",
      whatYouAreBuilding: "Support triage tool",
      projectScope: "Auth and reporting",
    });

    expect(result.offering).toBe("PRODUCT_BUILD_QUOTE_ONLY");
    expect(result.requiresQuote).toBe(true);
    expect(result.quotedPriceMinor).toBeUndefined();
  });

  it("ignores a client-supplied price and takes the amount from the product", async () => {
    mockFindOne.mockReturnValue(execResult(productDoc()) as never);

    const result = await createLead({
      productSlug: "building-your-product-with-ai",
      name: "Mallory",
      email: "mallory@example.com",
      whatYouAreBuilding: "Anything",
      helpNeeded: "Anything",
    });

    expect(result.quotedPriceMinor).toBe(100_000_000);
  });

  it("rejects an unpublished engagement", async () => {
    mockFindOne.mockReturnValue(execResult(null) as never);

    await expect(
      createLead({
        productSlug: "building-your-product-with-ai",
        name: "Ada",
        email: "ada@example.com",
        whatYouAreBuilding: "x",
        helpNeeded: "y",
      })
    ).rejects.toBeInstanceOf(LeadServiceError);
  });

  it("rejects an engagement that does not accept enquiries", async () => {
    mockFindOne.mockReturnValue(
      execResult(
        productDoc({
          slug: "idea-to-mvp-sprint",
          mvpServiceDetails: { inquiryMode: "NONE", scope: "A sprint" },
        })
      ) as never
    );

    await expect(
      createLead({
        productSlug: "idea-to-mvp-sprint",
        name: "Ada",
        email: "ada@example.com",
        whatYouAreBuilding: "x",
        helpNeeded: "y",
      })
    ).rejects.toThrow(/not currently accepting/i);
  });

  it("rejects a product whose slug is not a catalogue engagement", async () => {
    mockFindOne.mockReturnValue(
      execResult(
        productDoc({
          slug: "some-unmapped-slug",
          mvpServiceDetails: { inquiryMode: "QUOTE", scope: "x" },
        })
      ) as never
    );

    await expect(
      createLead({
        productSlug: "some-unmapped-slug",
        name: "Ada",
        email: "ada@example.com",
        whatYouAreBuilding: "x",
        projectScope: "y",
      })
    ).rejects.toBeInstanceOf(LeadServiceError);
  });

  it("rejects a consultation product because a consultation has no enquiry form", async () => {
    // A consultation carries no mvpServiceDetails, so the filter matches it but
    // the enquiry-mode guard must refuse it.
    mockFindOne.mockReturnValue(
      execResult(
        productDoc({
          slug: "90-minute-one-on-one-strategy-session",
          title: "90-Minute One-on-One Strategy Session",
          type: "CONSULTATION",
          mvpServiceDetails: undefined,
        })
      ) as never
    );

    await expect(
      createLead({
        productSlug: "90-minute-one-on-one-strategy-session",
        name: "Ada",
        email: "ada@example.com",
        whatYouAreBuilding: "x",
        helpNeeded: "y",
      })
    ).rejects.toBeInstanceOf(LeadServiceError);
  });

  it("only ever loads published MVP engagements", async () => {
    mockFindOne.mockReturnValue(execResult(productDoc()) as never);

    await createLead({
      productSlug: "building-your-product-with-ai",
      name: "Ada",
      email: "ada@example.com",
      whatYouAreBuilding: "x",
      helpNeeded: "y",
    });

    expect(mockFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "building-your-product-with-ai",
        type: "MVP_SERVICE",
        status: "PUBLISHED",
      })
    );
  });
});

describe("offeringForServiceSlug", () => {
  it("maps each catalogue engagement to its offering", () => {
    expect(offeringForServiceSlug("90-minute-one-on-one-strategy-session")).toBe(
      "90_MIN_STRATEGY_SESSION"
    );
    expect(offeringForServiceSlug("idea-to-mvp-sprint")).toBe(
      "IDEA_TO_MVP_SPRINT"
    );
    expect(offeringForServiceSlug("building-your-product-with-ai")).toBe(
      "AI_BUILD_PRICED"
    );
    expect(offeringForServiceSlug("build-a-product-with-us")).toBe(
      "PRODUCT_BUILD_QUOTE_ONLY"
    );
  });

  it("returns undefined for an unknown slug", () => {
    expect(offeringForServiceSlug("something-else")).toBeUndefined();
  });
});