import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/providers/storage", () => ({
  putObject: vi.fn(),
  getObject: vi.fn(),
  headObject: vi.fn(),
  deleteObject: vi.fn(),
  listObjects: vi.fn(),
  publicUrl: vi.fn((key: string) => `https://pub-bucket.r2.dev/${key}`),
}));

import {
  deleteObject,
  getObject,
  headObject,
  listObjects,
  putObject,
} from "@/lib/providers/storage";
import {
  deleteUpload,
  isImageMime,
  listUploads,
  readUpload,
  statUpload,
  writeUpload,
} from "@/lib/storage";

const mockedPutObject = vi.mocked(putObject);
const mockedGetObject = vi.mocked(getObject);
const mockedHeadObject = vi.mocked(headObject);
const mockedDeleteObject = vi.mocked(deleteObject);
const mockedListObjects = vi.mocked(listObjects);

beforeEach(() => {
  mockedPutObject.mockResolvedValue();
  mockedGetObject.mockResolvedValue({ data: Buffer.from("pdf-bytes"), size: 9 });
  mockedHeadObject.mockResolvedValue({ key: "abc.pdf", size: 9 });
  mockedDeleteObject.mockResolvedValue();
  mockedListObjects.mockResolvedValue([
    { key: "abc.pdf", size: 9 },
    { key: "def.png", size: 4 },
  ]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("writeUpload", () => {
  it("stores the file in R2 and returns a public URL", async () => {
    const stored = await writeUpload(
      Buffer.from("data"),
      "pitch.pdf",
      "application/pdf"
    );

    expect(mockedPutObject).toHaveBeenCalledWith(
      expect.objectContaining({
        body: Buffer.from("data"),
        contentType: "application/pdf",
      })
    );
    const { key } = mockedPutObject.mock.calls[0][0];
    expect(key).toMatch(/^[a-f0-9]{32}\.pdf$/);
    expect(stored).toMatchObject({
      name: "pitch.pdf",
      size: 4,
      type: "application/pdf",
      url: `https://pub-bucket.r2.dev/${key}`,
    });
  });
});

describe("readUpload", () => {
  it("returns the stored buffer", async () => {
    const data = await readUpload("abc.pdf");

    expect(mockedGetObject).toHaveBeenCalledWith("abc.pdf");
    expect(data?.toString()).toBe("pdf-bytes");
  });

  it("returns null when the object is missing", async () => {
    mockedGetObject.mockResolvedValue(null);

    await expect(readUpload("missing.pdf")).resolves.toBeNull();
  });

  it("rejects unsafe keys", async () => {
    await expect(readUpload("../etc/passwd")).resolves.toBeNull();

    expect(mockedGetObject).not.toHaveBeenCalled();
  });
});

describe("statUpload", () => {
  it("returns the object size", async () => {
    await expect(statUpload("abc.pdf")).resolves.toEqual({ size: 9 });

    expect(mockedHeadObject).toHaveBeenCalledWith("abc.pdf");
  });
});

describe("deleteUpload", () => {
  it("removes the object", async () => {
    await deleteUpload("abc.pdf");

    expect(mockedDeleteObject).toHaveBeenCalledWith("abc.pdf");
  });

  it("ignores unsafe keys", async () => {
    await deleteUpload("../etc/passwd");

    expect(mockedDeleteObject).not.toHaveBeenCalled();
  });
});

describe("listUploads", () => {
  it("returns stored keys and sizes", async () => {
    await expect(listUploads()).resolves.toEqual([
      { key: "abc.pdf", size: 9 },
      { key: "def.png", size: 4 },
    ]);
  });
});

describe("isImageMime", () => {
  it("flags image mime types", () => {
    expect(isImageMime("image/png")).toBe(true);
    expect(isImageMime("application/pdf")).toBe(false);
  });
});