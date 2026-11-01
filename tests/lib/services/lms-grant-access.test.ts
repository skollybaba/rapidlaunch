import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Product", () => ({
  Product: { findOne: vi.fn() },
}));

vi.mock("@/models/Enrollment", () => ({
  Enrollment: {
    findOne: mocks.findOne,
    updateOne: mocks.updateOne,
    create: mocks.create,
  },
}));

import { grantCourseAccess } from "@/lib/services/lms-service";

const USER_ID = "64b000000000000000000002";
const COURSE_ID = "64b000000000000000000001";
const ENROLLMENT_ID = "64b000000000000000000004";

function existing(overrides: Record<string, unknown> = {}) {
  const chain = {
    lean: vi.fn(() => chain),
    exec: vi.fn().mockResolvedValue({
      _id: ENROLLMENT_ID,
      userId: USER_ID,
      courseId: COURSE_ID,
      status: "ACTIVE",
      isBonus: false,
      accessSource: "PURCHASE",
      completedLessonIds: ["l1"],
      ...overrides,
    }),
  };
  return chain;
}

function updateResult() {
  return { exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateOne.mockReturnValue(updateResult());
  mocks.create.mockImplementation(async (doc: Record<string, unknown>) => ({
    _id: ENROLLMENT_ID,
    ...doc,
  }));
});

describe("grantCourseAccess access sources", () => {
  it("creates a complimentary enrollment with no order", async () => {
    mocks.findOne.mockReturnValue({
      lean: vi.fn(() => ({ exec: vi.fn().mockResolvedValue(null) })),
    });

    const result = await grantCourseAccess({
      userId: USER_ID,
      courseId: COURSE_ID,
      accessSource: "ADMIN_GRANT",
      grantedBy: "admin-1",
      grantNote: "Guest",
    });

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accessSource: "ADMIN_GRANT",
        grantedBy: "admin-1",
        grantNote: "Guest",
        sourceOrderId: null,
        isBonus: false,
      })
    );
    expect(result).toEqual({
      id: ENROLLMENT_ID,
      created: true,
      upgraded: false,
    });
  });

  it("does not downgrade paid access to a complimentary grant", async () => {
    mocks.findOne.mockReturnValue(existing());

    const result = await grantCourseAccess({
      userId: USER_ID,
      courseId: COURSE_ID,
      accessSource: "ADMIN_GRANT",
      grantedBy: "admin-1",
    });

    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: ENROLLMENT_ID,
      created: false,
      upgraded: false,
    });
  });

  it("upgrades a complimentary grant when the student buys the course", async () => {
    mocks.findOne.mockReturnValue(
      existing({ accessSource: "ADMIN_GRANT", grantedBy: "admin-1" })
    );

    const result = await grantCourseAccess({
      userId: USER_ID,
      courseId: COURSE_ID,
      sourceOrderId: "order-1",
    });

    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: ENROLLMENT_ID },
      {
        $set: expect.objectContaining({
          status: "ACTIVE",
          accessSource: "PURCHASE",
          sourceOrderId: "order-1",
          grantedBy: null,
          grantNote: null,
        }),
      }
    );
    expect(result.upgraded).toBe(true);
  });

  it("re-grants revoked access without resetting progress", async () => {
    mocks.findOne.mockReturnValue(
      existing({
        status: "REVOKED",
        accessSource: "ADMIN_GRANT",
        grantNote: "Old note",
      })
    );

    const result = await grantCourseAccess({
      userId: USER_ID,
      courseId: COURSE_ID,
      accessSource: "ADMIN_GRANT",
      grantedBy: "admin-2",
    });

    const update = mocks.updateOne.mock.calls[0][1] as {
      $set: Record<string, unknown>;
    };
    expect(update.$set.status).toBe("ACTIVE");
    expect(update.$set.grantNote).toBe("Old note");
    expect(update.$set).not.toHaveProperty("completedLessonIds");
    expect(result.created).toBe(false);
  });

  it("treats legacy bonus records as bonus access", async () => {
    mocks.findOne.mockReturnValue(
      existing({ accessSource: undefined, isBonus: true })
    );

    await grantCourseAccess({
      userId: USER_ID,
      courseId: COURSE_ID,
      accessSource: "ADMIN_GRANT",
    });

    expect(mocks.updateOne).not.toHaveBeenCalled();
  });
});
