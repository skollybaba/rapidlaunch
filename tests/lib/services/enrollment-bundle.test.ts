import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, mailAdapter, classroomAdapter } = vi.hoisted(() => ({
  mockEnv: {
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_REFRESH_TOKEN: "google-refresh-token",
    GOOGLE_CLASSROOM_OWNER_EMAIL: "owner@example.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    PAYSTACK_SECRET_KEY: "sk_test_dummy",
    PAYSTACK_WEBHOOK_SECRET: "whsec_dummy",
    WHATSAPP_ADMIN_NUMBERS: "",
  },
  mailAdapter: {
    sendTemplateEmail: vi.fn().mockResolvedValue({}),
    sendEmail: vi.fn().mockResolvedValue({}),
    sendTestEmail: vi.fn().mockResolvedValue({}),
  },
  classroomAdapter: {
    listConfiguredCourses: vi.fn().mockResolvedValue([]),
    getCourse: vi
      .fn()
      .mockResolvedValue({
        id: "CRS_X",
        name: "Classroom course",
        alternateLink: "https://classroom.google.com/c/CRS_X",
      }),
    enrollStudent: vi.fn().mockResolvedValue({
      studentId: "STU_1",
      alreadyEnrolled: false,
      errorCategory: null,
      providerResponse: {},
    }),
    checkEnrollment: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

vi.mock("@/models/Order", () => ({}));
vi.mock("@/models/Payment", () => ({}));
vi.mock("@/models/PaymentEvent", () => ({}));
vi.mock("@/models/Booking", () => ({}));

vi.mock("@/models/Fulfillment", () => ({
  Fulfillment: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("@/models/Product", () => ({
  Product: { find: vi.fn() },
}));

vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: vi.fn(() => mailAdapter),
}));

vi.mock("@/lib/providers/classroom", () => ({
  createClassroomAdapter: vi.fn(() => classroomAdapter),
}));

vi.mock("@/lib/services/whatsapp-service", () => ({
  notifyAdminsOrderPaid: vi.fn().mockResolvedValue({ sent: 1, skipped: 0 }),
}));

import { Fulfillment } from "@/models/Fulfillment";
import { Product } from "@/models/Product";
import { processCourseEnrollment } from "@/lib/services/order-service";

const mockProductFind = vi.mocked(Product.find);
const mockFulfillmentFindOne = vi.mocked(Fulfillment.findOne);
const mockFulfillmentFindOneAndUpdate = vi.mocked(Fulfillment.findOneAndUpdate);
const mockFulfillmentUpdateOne = vi.mocked(Fulfillment.updateOne);
const mockEnrollStudent = vi.mocked(classroomAdapter.enrollStudent);
const mockSendTemplateEmail = vi.mocked(mailAdapter.sendTemplateEmail);
const mockGetCourse = vi.mocked(classroomAdapter.getCourse);

function chain(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function updateChain() {
  return { exec: vi.fn().mockResolvedValue({}) } as never;
}

const parentEnrollmentId = "FL_PROD1";
const bonusEnrollmentId = "FL_PROD2";

type EnrollmentRecord = {
  _id: string;
  orderItemId: string;
  status: string;
  attempts: number;
  metadata: Record<string, unknown>;
  lastError?: string;
};

const enrollStates = new Map<string, EnrollmentRecord>();

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: "ORD1",
    orderReference: "QL-BUNDLE1",
    customerEmail: "buyer@example.com",
    status: "PAID",
    items: [
      {
        productId: "PROD1",
        titleSnapshot: "AI Product Strategy",
        typeSnapshot: "COURSE",
        unitPriceMinor: 80_000_00,
        quantity: 1,
      },
    ],
    metadata: {
      productType: "COURSE",
      productFulfillmentMode: "CLASSROOM",
      classroomCourseId: "CRS_PARENT",
      courseJoinUrl: undefined,
      bundleCourseIds: ["PROD2"],
      bundleCourseTitles: ["Bonus Course"],
    },
    ...overrides,
  };
}

function makeBonusProduct() {
  return [
    {
      _id: "PROD2",
      title: "Bonus Course",
      courseDetails: {
        classroomCourseId: "CRS_BONUS",
        courseJoinUrl: "",
      },
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  enrollStates.clear();

  mockProductFind.mockImplementation(() => chain(makeBonusProduct()) as never);

  mockFulfillmentFindOne.mockImplementation((filter) => {
    const itemId = (filter as { orderItemId?: unknown } | undefined)
      ?.orderItemId;
    return chain(enrollStates.get(itemId ? String(itemId) : "PROD1") ?? null);
  });

  mockFulfillmentFindOneAndUpdate.mockImplementation((filter) => {
    const itemId = String(
      (filter as { orderItemId?: unknown }).orderItemId ?? "PROD1"
    );
    const existing = enrollStates.get(itemId);
    if (existing) return chain(existing);
    const record: EnrollmentRecord = {
      _id: `FL_${itemId}`,
      orderItemId: itemId,
      status: "PENDING",
      attempts: 0,
      metadata: itemId === "PROD2" ? { bonusCourse: true } : {},
    };
    enrollStates.set(itemId, record);
    if (record._id !== itemId) enrollStates.set(record._id, record);
    return chain(record);
  });

  mockFulfillmentUpdateOne.mockImplementation((filter, update) => {
    const f = filter as { orderItemId?: unknown; _id?: unknown };
    const rawKey =
      f.orderItemId !== undefined
        ? String(f.orderItemId)
        : f._id !== undefined
          ? String(f._id)
          : "PROD1";
    const record = enrollStates.get(rawKey);
    if (record) {
      const set = (update as { $set?: Record<string, unknown> } | undefined)
        ?.$set ?? {};
      if (typeof set.status === "string") record.status = set.status;
      if (typeof set.attempts === "number") record.attempts = set.attempts;
      if (set.lastError !== undefined) record.lastError = String(set.lastError);
      if (set.metadata) {
        record.metadata = {
          ...(record.metadata ?? {}),
          ...(set.metadata as Record<string, unknown>),
        };
      }
    }
    return updateChain();
  });

  mockEnrollStudent.mockResolvedValue({
    studentId: "STU_1",
    alreadyEnrolled: false,
    errorCategory: null,
    providerResponse: {},
  });
  mockGetCourse.mockImplementation((courseId: string) =>
    Promise.resolve({
      id: courseId,
      name:
        courseId === "CRS_BONUS" ? "Bonus Classroom Course" : "Classroom course",
      alternateLink: `https://classroom.google.com/c/${courseId}`,
    })
  );
  mockSendTemplateEmail.mockResolvedValue({ providerMessageId: "M1", sentAt: new Date() });
});

describe("processCourseEnrollment with relational bundles", () => {
  it("enrolls the bought course and each bonus course, each with its own fulfillment", async () => {
    await processCourseEnrollment(makeOrder() as never);

    expect(mockEnrollStudent).toHaveBeenCalledTimes(2);
    expect(mockEnrollStudent).toHaveBeenCalledWith({
      courseId: "CRS_PARENT",
      studentEmail: "buyer@example.com",
    });
    expect(mockEnrollStudent).toHaveBeenCalledWith({
      courseId: "CRS_BONUS",
      studentEmail: "buyer@example.com",
    });

    const fulfilledUpdates = mockFulfillmentUpdateOne.mock.calls.filter(
      ([, update]) =>
        (update as { $set?: { status?: string } }).$set?.status === "FULFILLED"
    );
    expect(fulfilledUpdates).toHaveLength(2);

    const bonusRecord = enrollStates.get("PROD2");
    expect(bonusRecord?.status).toBe("FULFILLED");
    expect(bonusRecord?.metadata.bonusCourse).toBe(true);
    expect(bonusRecord?.metadata.courseId).toBe("CRS_BONUS");

    const parentRecord = enrollStates.get("PROD1");
    expect(parentRecord?.status).toBe("FULFILLED");
    expect(parentRecord?.metadata.bonusCourse).toBeUndefined();
    expect(parentRecord?.metadata.courseId).toBe("CRS_PARENT");
  });

  it("sends one access email per granted course", async () => {
    await processCourseEnrollment(makeOrder() as never);

    const calls = mockSendTemplateEmail.mock.calls.filter(
      ([input]) => input.templateKey === "course_access_fulfilled"
    );
    expect(calls).toHaveLength(2);
    const courseTitles = calls.map(([input]) => input.variables.courseTitle);
    expect(courseTitles).toContain("Bonus Classroom Course");
  });

  it("is idempotent — already-fulfilled bonus courses are not re-enrolled", async () => {
    enrollStates.set("PROD1", {
      _id: parentEnrollmentId,
      orderItemId: "PROD1",
      status: "FULFILLED",
      attempts: 1,
      metadata: { courseId: "CRS_PARENT" },
    });
    enrollStates.set("PROD2", {
      _id: bonusEnrollmentId,
      orderItemId: "PROD2",
      status: "FULFILLED",
      attempts: 1,
      metadata: { courseId: "CRS_BONUS", bonusCourse: true },
    });

    await processCourseEnrollment(makeOrder() as never);

    expect(mockEnrollStudent).not.toHaveBeenCalled();
    expect(mockFulfillmentUpdateOne).not.toHaveBeenCalled();
    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
  });

  it("ignores an order without a bundle", async () => {
    const order = makeOrder({ metadata: { productType: "COURSE", productFulfillmentMode: "CLASSROOM", classroomCourseId: "CRS_PARENT" } });

    await processCourseEnrollment(order as never);

    expect(mockEnrollStudent).toHaveBeenCalledTimes(1);
    expect(mockEnrollStudent).toHaveBeenCalledWith({
      courseId: "CRS_PARENT",
      studentEmail: "buyer@example.com",
    });
    expect(enrollStates.get("PROD2")).toBeUndefined();
  });

  it("skips bundle courses no longer in the catalog", async () => {
    mockProductFind.mockImplementation(() => chain([]) as never);

    await processCourseEnrollment(makeOrder() as never);

    expect(mockEnrollStudent).toHaveBeenCalledTimes(1);
    expect(mockEnrollStudent).toHaveBeenCalledWith({
      courseId: "CRS_PARENT",
      studentEmail: "buyer@example.com",
    });
  });

  it("flags a bonus course as needing action when its classroom is not configured", async () => {
    mockProductFind.mockImplementation(() =>
      chain([
        {
          _id: "PROD2",
          title: "Bonus Course",
          courseDetails: { classroomCourseId: "", courseJoinUrl: "" },
        },
      ]) as never
    );

    await processCourseEnrollment(makeOrder() as never);

    const bonusRecord = enrollStates.get("PROD2");
    expect(bonusRecord?.status).toBe("ACTION_REQUIRED");
    expect(bonusRecord?.lastError).toBe("CLASSROOM_COURSE_NOT_CONFIGURED");

    const sentToBonus = mockSendTemplateEmail.mock.calls.some(
      ([input]) =>
        input.templateKey === "course_access_action_required" &&
        input.variables.courseTitle === "Bonus Course"
    );
    expect(sentToBonus).toBe(true);
  });
});