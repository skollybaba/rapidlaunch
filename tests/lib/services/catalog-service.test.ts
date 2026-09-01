import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductDoc } from "@/types/product";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Product", () => ({
  Product: { find: vi.fn(), findOne: vi.fn() },
}));

import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import {
  getPublishedProductById,
  getPublishedProductBySlug,
  getRelatedProducts,
  listPublishedProducts,
} from "@/lib/services/catalog-service";

const mockFind = vi.mocked(Product.find);
const mockFindOne = vi.mocked(Product.findOne);

function doc(overrides: Partial<ProductDoc> = {}): ProductDoc {
  return {
    _id: "64f1c2a0b9d2c4a1f2a3b4c5",
    type: "COURSE",
    slug: "ai-product-craft",
    title: "AI Product Craft",
    shortDescription: "Short description",
    status: "PUBLISHED",
    priceMinor: 5_000_000,
    currency: "NGN",
    fulfillmentMode: "CLASSROOM",
    mediaUrls: [],
    featured: false,
    sortOrder: 1,
    courseDetails: { classroomCourseId: "123" },
    ...overrides,
  };
}

function findChain<T>(resolve: T) {
  return {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(resolve),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listPublishedProducts", () => {
  it("filters published products and sorts by sortOrder then title", async () => {
    mockFind.mockReturnValue(
      findChain([doc({ title: "B" }), doc({ title: "A" })]) as never
    );

    const products = await listPublishedProducts();

    expect(dbConnect).toHaveBeenCalledTimes(1);
    expect(mockFind).toHaveBeenCalledWith({ status: "PUBLISHED" });
    const chain = mockFind.mock.results[0].value as {
      sort: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
    };
    expect(chain.sort).toHaveBeenCalledWith({ sortOrder: 1, title: 1 });
    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({ id: String(doc()._id), status: "PUBLISHED" });
    expect(products[0]).not.toHaveProperty("description");
  });

  it("adds the requested type to the filter", async () => {
    mockFind.mockReturnValue(findChain([]) as never);
    await listPublishedProducts({ type: "BOOK", limit: 10 });
    expect(mockFind).toHaveBeenCalledWith({ status: "PUBLISHED", type: "BOOK" });
    const chain = mockFind.mock.results[0].value as {
      limit: ReturnType<typeof vi.fn>;
    };
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("always queries with the published filter", async () => {
    mockFind.mockReturnValue(findChain([]) as never);
    await listPublishedProducts({ type: "CONSULTATION" });
    expect(mockFind).toHaveBeenCalledWith({
      status: "PUBLISHED",
      type: "CONSULTATION",
    });
  });
});

describe("getPublishedProductBySlug", () => {
  it("queries with the slugified slug and returns the detail", async () => {
    const published = doc({ slug: "ai-product-craft" });
    mockFindOne.mockReturnValue(findChain(published) as never);

    const product = await getPublishedProductBySlug(
      "AI Product Craft!",
      "COURSE"
    );

    expect(mockFindOne).toHaveBeenCalledWith({
      status: "PUBLISHED",
      type: "COURSE",
      slug: "ai-product-craft",
    });
    expect(product?.id).toBe(String(published._id));
    expect(product?.title).toBe("AI Product Craft");
  });

  it("returns null when nothing matches", async () => {
    mockFindOne.mockReturnValue(findChain(null) as never);
    const product = await getPublishedProductBySlug("missing");
    expect(product).toBeNull();
  });
});

describe("getPublishedProductById", () => {
  it("returns null without querying when the id is empty", async () => {
    mockFindOne.mockReturnValue(findChain(null) as never);
    const product = await getPublishedProductById("");
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(product).toBeNull();
  });

  it("queries only published products by id", async () => {
    mockFindOne.mockReturnValue(findChain(doc()) as never);
    const product = await getPublishedProductById("64f1c2a0b9d2c4a1f2a3b4c5");
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: "64f1c2a0b9d2c4a1f2a3b4c5",
      status: "PUBLISHED",
    });
    expect(product).not.toBeNull();
  });
});

describe("getRelatedProducts", () => {
  it("excludes the current product and limits results", async () => {
    mockFind.mockReturnValue(findChain([doc({ title: "Other" })]) as never);

    const related = await getRelatedProducts({
      id: "64f1c2a0b9d2c4a1f2a3b4c5",
      type: "COURSE",
    });

    expect(mockFind).toHaveBeenCalledWith({
      status: "PUBLISHED",
      type: "COURSE",
      _id: { $ne: "64f1c2a0b9d2c4a1f2a3b4c5" },
    });
    expect(related).toHaveLength(1);
  });
});