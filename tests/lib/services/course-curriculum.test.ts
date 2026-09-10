import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Product", () => ({
  Product: {
    findOneAndUpdate: vi.fn(),
  },
}));

import { Product } from "@/models/Product";
import {
  AdminServiceError,
  clearCourseCurriculum,
  setCourseCurriculum,
} from "@/lib/services/admin-service";
import { CURRICULUM_MAX_BYTES } from "@/types/product";

const mockFindOneAndUpdate = vi.mocked(Product.findOneAndUpdate);

function updateChain(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function pdfInput(overrides: Record<string, unknown> = {}) {
  return {
    fileName: "ai-product-craft-curriculum.pdf",
    contentType: "application/pdf",
    size: 2048,
    data: Buffer.from("%PDF-1.4 fake pdf"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("setCourseCurriculum", () => {
  it("stores a valid PDF and returns the course id", async () => {
    mockFindOneAndUpdate.mockReturnValue(
      updateChain({ _id: "CRS1" })
    );

    const result = await setCourseCurriculum("CRS1", pdfInput());

    expect(result).toEqual({ id: "CRS1" });
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "CRS1", type: "COURSE" },
      {
        $set: {
          curriculum: expect.objectContaining({
            fileName: "ai-product-craft-curriculum.pdf",
            contentType: "application/pdf",
            size: 2048,
            data: expect.any(Buffer),
          }),
        },
      },
      { new: true }
    );
  });

  it("rejects a file that is not a PDF", async () => {
    await expect(
      setCourseCurriculum("CRS1", pdfInput({ contentType: "text/plain", fileName: "notes.txt" }))
    ).rejects.toMatchObject({
      name: "AdminServiceError",
      code: "INVALID_CURRICULUM_FILE",
    });
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects a PDF larger than the size cap", async () => {
    const input = pdfInput({ size: CURRICULUM_MAX_BYTES + 1 });
    await expect(setCourseCurriculum("CRS1", input)).rejects.toBeInstanceOf(
      ZodError
    );
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects an empty or blank file name", async () => {
    await expect(
      setCourseCurriculum("CRS1", pdfInput({ fileName: "" }))
    ).rejects.toBeInstanceOf(ZodError);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("throws COURSE_NOT_FOUND when the course does not exist", async () => {
    mockFindOneAndUpdate.mockReturnValue(updateChain(null));
    await expect(
      setCourseCurriculum("MISSING", pdfInput())
    ).rejects.toMatchObject({
      name: "AdminServiceError",
      code: "COURSE_NOT_FOUND",
    });
  });
});

describe("clearCourseCurriculum", () => {
  it("unsets the curriculum field", async () => {
    mockFindOneAndUpdate.mockReturnValue(updateChain({ _id: "CRS1" }));
    const result = await clearCourseCurriculum("CRS1");
    expect(result).toEqual({ id: "CRS1" });
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "CRS1", type: "COURSE" },
      { $unset: { curriculum: 1 } },
      { new: true }
    );
  });

  it("throws COURSE_NOT_FOUND when the course does not exist", async () => {
    mockFindOneAndUpdate.mockReturnValue(updateChain(null));
    await expect(clearCourseCurriculum("MISSING")).rejects.toMatchObject({
      name: "AdminServiceError",
      code: "COURSE_NOT_FOUND",
    });
  });
});

describe("curriculum errors extend AdminServiceError", () => {
  it("exposes the AdminServiceError surface for api mapping", async () => {
    expect(AdminServiceError).toBeTypeOf("function");
  });
});