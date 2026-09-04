import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResourceDoc } from "@/types/resource";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Resource", () => ({
  Resource: {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

import { dbConnect } from "@/lib/db";
import { Resource } from "@/models/Resource";
import {
  createResource,
  deleteResource,
  getAdminResources,
  getPublishedResourceBySlug,
  getPublishedResources,
  getResourceById,
  updateResource,
} from "@/lib/services/resource-service";

const mockFind = vi.mocked(Resource.find);
const mockFindOne = vi.mocked(Resource.findOne);
const mockFindById = vi.mocked(Resource.findById);
const mockCreate = vi.mocked(Resource.create);
const mockFindByIdAndUpdate = vi.mocked(Resource.findByIdAndUpdate);
const mockFindByIdAndDelete = vi.mocked(Resource.findByIdAndDelete);

function doc(overrides: Partial<ResourceDoc> = {}): ResourceDoc {
  return {
    _id: "64f1c2a0b9d2c4a1f2a3b4c5",
    type: "ARTICLE",
    title: "An insight",
    slug: "an-insight",
    summary: "A short summary",
    published: true,
    ...overrides,
  };
}

function findChain<T>(resolve: T) {
  return {
    sort: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(resolve),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAdminResources", () => {
  it("filters by type and returns rows with stringified ids", async () => {
    mockFind.mockReturnValue(findChain([doc()]) as never);

    const rows = await getAdminResources({ type: "ARTICLE" });

    expect(dbConnect).toHaveBeenCalledTimes(1);
    expect(mockFind).toHaveBeenCalledWith({ type: "ARTICLE" });
    const chain = mockFind.mock.results[0].value as {
      sort: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
    };
    expect(chain.sort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: String(doc()._id), published: true });
  });

  it("searches title, slug, and summary when a query is provided", async () => {
    mockFind.mockReturnValue(findChain([]) as never);
    await getAdminResources({ type: "ARTICLE", q: "idea" });
    expect(mockFind).toHaveBeenCalledWith({
      type: "ARTICLE",
      $or: [
        { title: { $regex: "idea", $options: "i" } },
        { slug: { $regex: "idea", $options: "i" } },
        { summary: { $regex: "idea", $options: "i" } },
      ],
    });
  });

  it("omits the search filter for empty queries and adds published filter", async () => {
    mockFind.mockReturnValue(findChain([]) as never);
    await getAdminResources({ type: "VIDEO", q: "  ", published: false });
    expect(mockFind).toHaveBeenCalledWith({ type: "VIDEO", published: false });
  });
});

describe("getPublishedResources", () => {
  it("only returns published resources, newest first", async () => {
    mockFind.mockReturnValue(
      findChain([doc({ type: "VIDEO", slug: "a-video" })]) as never
    );

    const rows = await getPublishedResources();

    expect(mockFind).toHaveBeenCalledWith({ published: true });
    const chain = mockFind.mock.results[0].value as {
      sort: ReturnType<typeof vi.fn>;
    };
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(rows[0]).toMatchObject({ slug: "a-video" });
  });
});

describe("getResourceById", () => {
  it("finds by id", async () => {
    const resource = doc();
    mockFindById.mockReturnValue({ lean: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue(resource) } as never);
    const found = await getResourceById("64f1c2a0b9d2c4a1f2a3b4c5");
    expect(mockFindById).toHaveBeenCalledWith("64f1c2a0b9d2c4a1f2a3b4c5");
    expect(found?.title).toBe("An insight");
  });

  it("returns null when nothing matches", async () => {
    mockFindById.mockReturnValue({ lean: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue(null) } as never);
    const found = await getResourceById("missing");
    expect(found).toBeNull();
  });
});

describe("getPublishedResourceBySlug", () => {
  it("only resolves a published resource by slug", async () => {
    const resource = doc({ type: "VIDEO", slug: "a-video" });
    mockFindOne.mockReturnValue({
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(resource),
    } as never);

    const found = await getPublishedResourceBySlug("a-video");

    expect(mockFindOne).toHaveBeenCalledWith({ slug: "a-video", published: true });
    expect(found?.title).toBe("An insight");
  });

  it("returns null when the resource is unpublished or missing", async () => {
    mockFindOne.mockReturnValue({
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    } as never);
    const found = await getPublishedResourceBySlug("draft-only");
    expect(found).toBeNull();
  });
});

describe("createResource", () => {
  it("creates a valid resource", async () => {
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    } as never);
    const created = { _id: "new-id", slug: "new-resource" };
    mockCreate.mockResolvedValue(created as never);

    const result = await createResource({
      type: "ARTICLE",
      title: "New resource",
      slug: "new-resource",
      published: true,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "new-resource", published: true })
    );
    expect(result).toMatchObject({ _id: "new-id" });
  });

  it("rejects duplicate slugs", async () => {
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({ _id: "existing" }),
    } as never);

    await expect(
      createResource({
        type: "ARTICLE",
        title: "New resource",
        slug: "an-insight",
      })
    ).rejects.toMatchObject({ code: "SLUG_IN_USE" });
  });
});

describe("updateResource", () => {
  it("throws when the resource does not exist", async () => {
    mockFindOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    } as never);
    mockFindByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    } as never);

    await expect(
      updateResource("missing", {
        type: "ARTICLE",
        title: "Anything",
        slug: "anything",
      })
    ).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
  });
});

describe("deleteResource", () => {
  it("throws when there is nothing to delete", async () => {
    mockFindByIdAndDelete.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as never);

    await expect(deleteResource("missing")).rejects.toMatchObject({
      code: "RESOURCE_NOT_FOUND",
    });
  });

  it("deletes an existing resource", async () => {
    mockFindByIdAndDelete.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ _id: "exists" }),
    } as never);
    await expect(deleteResource("exists")).resolves.toBeUndefined();
  });
});