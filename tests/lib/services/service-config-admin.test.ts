import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Product", () => ({
  Product: { find: vi.fn(), findOne: vi.fn() },
}));

vi.mock("@/models/Lead", () => ({
  Lead: { aggregate: vi.fn() },
}));

import { Product } from "@/models/Product";
import { updateServiceConfig } from "@/lib/services/admin-service";

const mockFindOne = vi.mocked(Product.findOne);

function serviceDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: "64f1c2a0b9d2c4a1f2a3b4c5",
    type: "MVP_SERVICE",
    slug: "build-a-product-with-us",
    title: "Build a Product With Us",
    status: "PUBLISHED",
    priceMinor: 0,
    currency: "NGN",
    fulfillmentMode: "MANUAL",
    mvpServiceDetails: {
      quoteMode: true,
      inquiryMode: "QUOTE",
      scope: "A bespoke build",
    },
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("updateServiceConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("turns an enquiry flow on while drafting", async () => {
    const doc = serviceDoc({
      status: "DRAFT",
      priceMinor: 100_000_000,
      mvpServiceDetails: { quoteMode: false, inquiryMode: "NONE", scope: "x" },
    });
    mockFindOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(doc) } as never);

    const result = await updateServiceConfig(String(doc._id), {
      inquiryMode: "INTEREST",
    });

    expect(doc.mvpServiceDetails?.inquiryMode).toBe("INTEREST");
    expect(doc.save).toHaveBeenCalled();
    expect(result.inquiryMode).toBe("INTEREST");
  });

  it("refuses to leave a published engagement with no price and no quote mode", async () => {
    const doc = serviceDoc({
      status: "PUBLISHED",
      priceMinor: 0,
      mvpServiceDetails: { quoteMode: false, inquiryMode: "NONE", scope: "x" },
    });
    mockFindOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(doc) } as never);

    await expect(
      updateServiceConfig(String(doc._id), { inquiryMode: "INTEREST" })
    ).rejects.toThrow(/needs a price/i);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it("keeps quoteMode consistent when switching to a quote flow", async () => {
    const doc = serviceDoc({
      priceMinor: 50_000_000,
      mvpServiceDetails: { quoteMode: false, inquiryMode: "INTEREST", scope: "x" },
    });
    mockFindOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(doc) } as never);

    await updateServiceConfig(String(doc._id), { inquiryMode: "QUOTE" });

    expect(doc.mvpServiceDetails?.quoteMode).toBe(true);
  });

  it("refuses to publish an engagement with no price and no quote mode", async () => {
    const doc = serviceDoc({
      status: "DRAFT",
      priceMinor: 0,
      mvpServiceDetails: { quoteMode: false, inquiryMode: "NONE", scope: "x" },
    });
    mockFindOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(doc) } as never);

    await expect(
      updateServiceConfig(String(doc._id), { status: "PUBLISHED" })
    ).rejects.toThrow(/needs a price/i);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it("allows publishing a priced engagement", async () => {
    const doc = serviceDoc({
      status: "DRAFT",
      priceMinor: 100_000_000,
      mvpServiceDetails: { quoteMode: false, inquiryMode: "INTEREST", scope: "x" },
    });
    mockFindOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(doc) } as never);

    await updateServiceConfig(String(doc._id), { status: "PUBLISHED" });

    expect(doc.status).toBe("PUBLISHED");
    expect(doc.save).toHaveBeenCalled();
  });

  it("allows archiving without a price", async () => {
    const doc = serviceDoc({ status: "PUBLISHED" });
    mockFindOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(doc) } as never);

    await updateServiceConfig(String(doc._id), { status: "ARCHIVED" });

    expect(doc.status).toBe("ARCHIVED");
  });

  it("does not change a price, even if one is supplied alongside a config change", async () => {
    const doc = serviceDoc({
      priceMinor: 100_000_000,
      mvpServiceDetails: { quoteMode: false, inquiryMode: "INTEREST", scope: "x" },
    });
    mockFindOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(doc) } as never);

    await updateServiceConfig(String(doc._id), {
      status: "DRAFT",
    } as never);

    expect(doc.priceMinor).toBe(100_000_000);
  });

  it("rejects a malformed id", async () => {
    await expect(
      updateServiceConfig("not-an-id", { status: "PUBLISHED" })
    ).rejects.toThrow(/not found/i);
  });

  it("rejects an engagement that does not exist", async () => {
    mockFindOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as never);

    await expect(
      updateServiceConfig("64f1c2a0b9d2c4a1f2a3b4c5", { status: "PUBLISHED" })
    ).rejects.toThrow(/not found/i);
  });
});