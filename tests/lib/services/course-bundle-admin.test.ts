import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NEXT_PUBLIC_APP_URL: "https://quicklaunch.example",
    PAYSTACK_SECRET_KEY: "sk_test_unit_dummy",
    PAYSTACK_WEBHOOK_SECRET: "whsec_unit_dummy",
    REMINDER_CRON_SECRET: "unit-test-reminder-secret",
    WHATSAPP_ADMIN_NUMBERS: "",
  },
}));

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

vi.mock("@/models/Booking", () => ({}));
vi.mock("@/models/Fulfillment", () => ({}));
vi.mock("@/models/Order", () => ({}));
vi.mock("@/models/Payment", () => ({}));
vi.mock("@/models/User", () => ({}));

vi.mock("@/models/Product", () => ({
  Product: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: vi.fn(() => ({
    sendTemplateEmail: vi.fn().mockResolvedValue({}),
    sendEmail: vi.fn().mockResolvedValue({}),
    sendTestEmail: vi.fn().mockResolvedValue({}),
  })),
}));

import { Product } from "@/models/Product";
import {
  createCourse,
  getCourseBundleChoices,
  updateCourse,
} from "@/lib/services/admin-service";

const mockFind = vi.mocked(Product.find);
const mockFindOne = vi.mocked(Product.findOne);
const mockCreate = vi.mocked(Product.create);
const mockFindByIdAndUpdate = vi.mocked(Product.findByIdAndUpdate);

function chain(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

const bundleableCourses = [
  { _id: "CRS_A", title: "Course A", slug: "course-a", status: "PUBLISHED" },
  { _id: "CRS_B", title: "Course B", slug: "course-b", status: "DRAFT" },
];

const baseInput = {
  title: "Parent Course",
  slug: "parent-course",
  status: "PUBLISHED",
  priceMinor: 50_000_00,
  fulfillmentMode: "CLASSROOM",
  courseDetails: { classroomCourseId: "CRS_PARENT_CLASSROOM" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindOne.mockImplementation(() => chain(null));
  mockFind.mockImplementation(() => chain(bundleableCourses));
  mockCreate.mockResolvedValue({ _id: "CRS_PARENT" } as never);
  mockFindByIdAndUpdate.mockImplementation(() =>
    chain({
      _id: "CRS_PARENT",
      slug: "parent-course",
      title: "Parent Course",
      status: "PUBLISHED",
    })
  );
});

describe("createCourse bundle sanitation", () => {
  it("keeps only real course ids, in the order supplied, and ignores non-courses", async () => {
    await createCourse({
      ...baseInput,
      bundleCourseIds: ["CRS_A", "bogus-id", "CRS_B"],
    });

    const created = mockCreate.mock.calls[0][0] as {
      bundleCourseIds: string[];
    };
    expect(created.bundleCourseIds).toEqual(["CRS_A", "CRS_B"]);
  });

  it("defaults to an empty bundle when nothing is selected", async () => {
    await createCourse({ ...baseInput });

    const created = mockCreate.mock.calls[0][0] as {
      bundleCourseIds: string[];
    };
    expect(created.bundleCourseIds).toEqual([]);
  });
});

describe("updateCourse bundle sanitation", () => {
  it("removes the course itself from its own bundle", async () => {
    await updateCourse("CRS_PARENT", {
      ...baseInput,
      bundleCourseIds: ["CRS_PARENT", "CRS_A"],
    });

    const updated = mockFindByIdAndUpdate.mock.calls[0][1] as {
      $set: { bundleCourseIds: string[] };
    };
    expect(updated.$set.bundleCourseIds).toEqual(["CRS_A"]);
  });
});

describe("getCourseBundleChoices", () => {
  it("is limited to course products and returns picker fields", async () => {
    const choices = await getCourseBundleChoices();

    expect(choices).toEqual([
      {
        id: "CRS_A",
        title: "Course A",
        slug: "course-a",
        status: "PUBLISHED",
      },
      {
        id: "CRS_B",
        title: "Course B",
        slug: "course-b",
        status: "DRAFT",
      },
    ]);

    const filterAny = mockFind.mock.calls[0][0] as {
      type?: string;
      status?: { $ne: string };
    };
    expect(filterAny.type).toBe("COURSE");
    expect(filterAny.status?.$ne).toBe("ARCHIVED");
  });
});