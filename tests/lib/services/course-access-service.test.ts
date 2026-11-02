import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enrollmentFind: vi.fn(),
  enrollmentExists: vi.fn(),
  enrollmentUpdateOne: vi.fn(),
  productFindOne: vi.fn(),
  productExists: vi.fn(),
  userFind: vi.fn(),
  userFindById: vi.fn(),
  grantCourseAccess: vi.fn(),
  sendTemplateEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

vi.mock("@/models/Enrollment", () => ({
  Enrollment: {
    find: mocks.enrollmentFind,
    exists: mocks.enrollmentExists,
    updateOne: mocks.enrollmentUpdateOne,
  },
}));

vi.mock("@/models/Product", () => ({
  Product: {
    findOne: mocks.productFindOne,
    exists: mocks.productExists,
  },
}));

vi.mock("@/models/User", () => ({
  User: {
    find: mocks.userFind,
    findById: mocks.userFindById,
  },
}));

vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: vi.fn(() => ({
    sendTemplateEmail: mocks.sendTemplateEmail,
  })),
}));

vi.mock("@/lib/services/lms-service", () => ({
  grantCourseAccess: mocks.grantCourseAccess,
}));

import {
  CourseAccessServiceError,
  grantAdminCourseAccess,
  listCourseAccess,
  revokeAdminCourseAccess,
  searchCourseAccessCandidates,
} from "@/lib/services/course-access-service";

const COURSE_ID = "64b000000000000000000001";
const USER_ID = "64b000000000000000000002";
const ADMIN_ID = "64b000000000000000000003";
const ENROLLMENT_ID = "64b000000000000000000004";

/** Mongoose query chain: every builder returns itself, `exec` resolves. */
function query<T>(result: T) {
  const chain = {
    select: vi.fn(() => chain),
    sort: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    lean: vi.fn(() => chain),
    exec: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

function updateResult(modifiedCount: number) {
  return { exec: vi.fn().mockResolvedValue({ modifiedCount }) };
}

function course(overrides: Record<string, unknown> = {}) {
  return {
    _id: COURSE_ID,
    slug: "launch-fast",
    title: "Launch Fast",
    ...overrides,
  };
}

function user(overrides: Record<string, unknown> = {}) {
  return {
    _id: USER_ID,
    email: "ada@example.com",
    name: "Ada",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendTemplateEmail.mockResolvedValue({
    providerMessageId: "msg-1",
    sentAt: new Date(),
  });
  mocks.grantCourseAccess.mockResolvedValue({
    id: ENROLLMENT_ID,
    created: true,
    upgraded: false,
  });
});

describe("grantAdminCourseAccess", () => {
  it("creates a complimentary enrollment with no order and emails the student", async () => {
    mocks.productFindOne.mockReturnValue(query(course()));
    mocks.userFindById.mockReturnValue(query(user()));
    mocks.enrollmentExists.mockResolvedValue(null);

    const result = await grantAdminCourseAccess({
      courseId: COURSE_ID,
      userId: USER_ID,
      grantedBy: ADMIN_ID,
      note: "  Spoke at our workshop  ",
    });

    expect(mocks.grantCourseAccess).toHaveBeenCalledWith({
      userId: USER_ID,
      courseId: COURSE_ID,
      accessSource: "ADMIN_GRANT",
      grantedBy: ADMIN_ID,
      grantNote: "Spoke at our workshop",
    });
    // No order or payment is involved in a complimentary grant.
    const call = mocks.grantCourseAccess.mock.calls[0][0];
    expect(call.sourceOrderId).toBeUndefined();

    expect(mocks.sendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: "course_access_fulfilled",
        to: "ada@example.com",
        variables: expect.objectContaining({
          courseUrl: "http://localhost:3000/learn/launch-fast",
        }),
      })
    );

    expect(result).toMatchObject({
      enrollmentId: ENROLLMENT_ID,
      created: true,
      alreadyHadAccess: false,
      emailSent: true,
    });
  });

  it("keeps existing access and skips the email when the student already has the course", async () => {
    mocks.productFindOne.mockReturnValue(query(course()));
    mocks.userFindById.mockReturnValue(query(user()));
    mocks.enrollmentExists.mockResolvedValue({ _id: ENROLLMENT_ID });
    mocks.grantCourseAccess.mockResolvedValue({
      id: ENROLLMENT_ID,
      created: false,
      upgraded: false,
    });

    const result = await grantAdminCourseAccess({
      courseId: COURSE_ID,
      userId: USER_ID,
      grantedBy: ADMIN_ID,
    });

    expect(result.alreadyHadAccess).toBe(true);
    expect(result.emailSent).toBe(false);
    expect(mocks.sendTemplateEmail).not.toHaveBeenCalled();
  });

  it("keeps the grant when the notification email fails", async () => {
    mocks.productFindOne.mockReturnValue(query(course()));
    mocks.userFindById.mockReturnValue(query(user()));
    mocks.enrollmentExists.mockResolvedValue(null);
    mocks.sendTemplateEmail.mockRejectedValue(new Error("SMTP down"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await grantAdminCourseAccess({
      courseId: COURSE_ID,
      userId: USER_ID,
      grantedBy: ADMIN_ID,
    });

    expect(result.emailSent).toBe(false);
    expect(result.enrollmentId).toBe(ENROLLMENT_ID);
    consoleError.mockRestore();
  });

  it("rejects a malformed course id before touching the database", async () => {
    await expect(
      grantAdminCourseAccess({
        courseId: "not-an-id",
        userId: USER_ID,
        grantedBy: ADMIN_ID,
      })
    ).rejects.toMatchObject({ code: "COURSE_NOT_FOUND", status: 404 });
    expect(mocks.grantCourseAccess).not.toHaveBeenCalled();
  });

  it("rejects a missing course", async () => {
    mocks.productFindOne.mockReturnValue(query(null));
    mocks.userFindById.mockReturnValue(query(user()));

    await expect(
      grantAdminCourseAccess({
        courseId: COURSE_ID,
        userId: USER_ID,
        grantedBy: ADMIN_ID,
      })
    ).rejects.toMatchObject({ code: "COURSE_NOT_FOUND", status: 404 });
    expect(mocks.grantCourseAccess).not.toHaveBeenCalled();
  });

  it("rejects a missing account", async () => {
    mocks.productFindOne.mockReturnValue(query(course()));
    mocks.userFindById.mockReturnValue(query(null));

    await expect(
      grantAdminCourseAccess({
        courseId: COURSE_ID,
        userId: USER_ID,
        grantedBy: ADMIN_ID,
      })
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND", status: 404 });
  });
});

describe("revokeAdminCourseAccess", () => {
  it("revokes a complimentary grant", async () => {
    mocks.enrollmentUpdateOne.mockReturnValue(updateResult(1));

    const revoked = await revokeAdminCourseAccess({
      courseId: COURSE_ID,
      userId: USER_ID,
    });

    expect(revoked).toBe(true);
    expect(mocks.enrollmentUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ accessSource: "ADMIN_GRANT" }),
      { $set: { status: "REVOKED" } }
    );
  });

  it("refuses to revoke paid access", async () => {
    mocks.enrollmentUpdateOne.mockReturnValue(updateResult(0));
    mocks.enrollmentExists.mockResolvedValue({ _id: ENROLLMENT_ID });

    await expect(
      revokeAdminCourseAccess({ courseId: COURSE_ID, userId: USER_ID })
    ).rejects.toMatchObject({
      code: "NOT_COMPLIMENTARY",
      status: 409,
    });
  });

  it("reports a student who has no access at all", async () => {
    mocks.enrollmentUpdateOne.mockReturnValue(updateResult(0));
    mocks.enrollmentExists.mockResolvedValue(null);

    await expect(
      revokeAdminCourseAccess({ courseId: COURSE_ID, userId: USER_ID })
    ).rejects.toBeInstanceOf(CourseAccessServiceError);
  });
});

describe("listCourseAccess", () => {
  it("returns paid, bonus and complimentary seats with the granting admin", async () => {
    mocks.enrollmentFind.mockReturnValue(
      query([
        {
          _id: "E1",
          userId: USER_ID,
          accessSource: "ADMIN_GRANT",
          isBonus: false,
          enrolledAt: new Date("2026-01-01T00:00:00Z"),
          lastAccessedAt: null,
          grantedBy: ADMIN_ID,
          grantNote: "Guest speaker",
        },
        {
          _id: "E2",
          userId: "64b000000000000000000009",
          isBonus: true,
          enrolledAt: new Date("2026-01-02T00:00:00Z"),
          lastAccessedAt: new Date("2026-01-03T00:00:00Z"),
        },
        {
          _id: "E3",
          userId: "64b000000000000000000010",
          isBonus: false,
          enrolledAt: new Date("2026-01-04T00:00:00Z"),
          lastAccessedAt: null,
        },
      ])
    );
    mocks.userFind.mockReturnValue(
      query([
        user(),
        { _id: ADMIN_ID, email: "owner@example.com", name: "Owner" },
      ])
    );

    const rows = await listCourseAccess(COURSE_ID);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      enrollmentId: "E1",
      accessSource: "ADMIN_GRANT",
      grantedByEmail: "owner@example.com",
      grantNote: "Guest speaker",
    });
    // Records created before access sources existed fall back to isBonus.
    expect(rows[1].accessSource).toBe("BONUS");
    expect(rows[2].accessSource).toBe("PURCHASE");
    // A deleted account keeps its seat but is labelled instead of left blank.
    expect(rows[2].email).toBe("Deleted account");
  });

  it("returns nothing without querying users when the course has no seats", async () => {
    mocks.enrollmentFind.mockReturnValue(query([]));

    await expect(listCourseAccess(COURSE_ID)).resolves.toEqual([]);
    expect(mocks.userFind).not.toHaveBeenCalled();
  });
});

describe("searchCourseAccessCandidates", () => {
  it("flags accounts that already have access", async () => {
    mocks.productExists.mockResolvedValue({ _id: COURSE_ID });
    mocks.userFind.mockReturnValue(
      query([
        user(),
        { _id: "64b000000000000000000011", email: "grace@example.com" },
      ])
    );
    mocks.enrollmentFind.mockReturnValue(
      query([{ userId: USER_ID }])
    );

    const candidates = await searchCourseAccessCandidates({
      courseId: COURSE_ID,
      query: "a",
    });

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      id: USER_ID,
      email: "ada@example.com",
      hasAccess: true,
    });
    expect(candidates[1].hasAccess).toBe(false);
  });

  it("filters accounts by email or name instead of returning everyone", async () => {
    mocks.productExists.mockResolvedValue({ _id: COURSE_ID });
    mocks.userFind.mockReturnValue(query([user()]));
    mocks.enrollmentFind.mockReturnValue(query([]));

    await searchCourseAccessCandidates({ courseId: COURSE_ID, query: "ada" });

    const filter = mocks.userFind.mock.calls[0][0] as {
      $or?: Array<Record<string, RegExp>>;
    };
    expect(filter.$or).toHaveLength(2);
    const [emailClause, nameClause] = filter.$or ?? [];
    expect(Object.keys(emailClause)).toEqual(["email"]);
    expect(Object.keys(nameClause)).toEqual(["name"]);
    expect(emailClause.email).toBeInstanceOf(RegExp);
    expect(emailClause.email.source).toBe("ada");
    expect(emailClause.email.flags).toContain("i");
  });

  it("trims the search term and escapes regex metacharacters", async () => {
    mocks.productExists.mockResolvedValue({ _id: COURSE_ID });
    mocks.userFind.mockReturnValue(query([]));
    mocks.enrollmentFind.mockReturnValue(query([]));

    await searchCourseAccessCandidates({
      courseId: COURSE_ID,
      query: "  ada.b@example.com  ",
    });

    const filter = mocks.userFind.mock.calls[0][0] as {
      $or?: Array<Record<string, RegExp>>;
    };
    // `a.b` must match a literal dot, not any character.
    expect(filter.$or?.[0].email.source).toBe("ada\\.b@example\\.com");
    expect(filter.$or?.[0].email.test("ada.b@example.com")).toBe(true);
    expect(filter.$or?.[0].email.test("adaXb@example.com")).toBe(false);
  });

  it("returns recent accounts without a filter when the query is empty", async () => {
    mocks.productExists.mockResolvedValue({ _id: COURSE_ID });
    mocks.userFind.mockReturnValue(query([user()]));
    mocks.enrollmentFind.mockReturnValue(query([]));

    await searchCourseAccessCandidates({ courseId: COURSE_ID, query: "   " });

    expect(mocks.userFind).toHaveBeenCalledWith({});
  });
});
