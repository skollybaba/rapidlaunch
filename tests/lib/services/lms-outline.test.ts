import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Product", () => ({
  Product: { findOne: vi.fn() },
}));

vi.mock("@/models/Enrollment", () => ({
  Enrollment: { findOne: vi.fn() },
}));

import { Enrollment } from "@/models/Enrollment";
import { Product } from "@/models/Product";
import { getCourseOutlineForUser } from "@/lib/services/lms-service";

const mockProductFindOne = vi.mocked(Product.findOne);
const mockEnrollmentFindOne = vi.mocked(Enrollment.findOne);

function chainWithSelect(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
  } as never;
}

function chainPlain(result: unknown) {
  return {
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
  } as never;
}

const videoLesson = {
  id: "l1",
  title: "Welcome video",
  type: "VIDEO",
  youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

function courseDoc(beforeYouStart: unknown) {
  return {
    _id: "CRS1",
    slug: "launch-fast",
    title: "Launch Fast",
    courseDetails: {
      modules: [
        { id: "m1", title: "Orientation", lessons: [videoLesson] },
      ],
      beforeYouStart,
    },
  };
}

function enrollmentDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: "ENR1",
    userId: "U1",
    courseId: "CRS1",
    status: "ACTIVE",
    completedLessonIds: [],
    lastLessonId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCourseOutlineForUser with a before-you-start page", () => {
  it("returns the enabled page with content when the student has not started", async () => {
    mockProductFindOne.mockReturnValue(
      chainWithSelect(
        courseDoc({
          enabled: true,
          title: "Welcome",
          youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
          contentHtml: "<p>Ready?</p><script>alert(1)</script>",
          ctaLabel: "Join",
          ctaUrl: "https://chat.whatsapp.com/abc",
        })
      )
    );
    mockEnrollmentFindOne.mockReturnValue(chainPlain(enrollmentDoc()));

    const outline = await getCourseOutlineForUser("U1", "launch-fast");

    expect(outline.hasStarted).toBe(false);
    expect(outline.beforeYouStart).toEqual({
      enabled: true,
      title: "Welcome",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
      contentHtml: "<p>Ready?</p>",
      ctaLabel: "Join",
      ctaUrl: "https://chat.whatsapp.com/abc",
    });
  });

  it("omits the page when it is disabled", async () => {
    mockProductFindOne.mockReturnValue(
      chainWithSelect(
        courseDoc({ enabled: false, contentHtml: "<p>Draft.</p>" })
      )
    );
    mockEnrollmentFindOne.mockReturnValue(chainPlain(enrollmentDoc()));

    const outline = await getCourseOutlineForUser("U1", "launch-fast");

    expect(outline.beforeYouStart).toBeUndefined();
  });

  it("omits the page when enabled but it holds neither video nor body", async () => {
    mockProductFindOne.mockReturnValue(
      chainWithSelect(courseDoc({ enabled: true, title: "Empty page" }))
    );
    mockEnrollmentFindOne.mockReturnValue(chainPlain(enrollmentDoc()));

    const outline = await getCourseOutlineForUser("U1", "launch-fast");

    expect(outline.beforeYouStart).toBeUndefined();
  });

  it("still ships the page for a returning student, gated by hasStarted", async () => {
    mockProductFindOne.mockReturnValue(
      chainWithSelect(
        courseDoc({
          enabled: true,
          contentHtml: "<p>Ready?</p>",
        })
      )
    );
    mockEnrollmentFindOne.mockReturnValue(
      chainPlain(enrollmentDoc({ completedLessonIds: ["l1"] }))
    );

    const outline = await getCourseOutlineForUser("U1", "launch-fast");

    expect(outline.hasStarted).toBe(true);
    expect(outline.beforeYouStart?.enabled).toBe(true);
  });

  it("treats an opened lesson as started even without completions", async () => {
    mockProductFindOne.mockReturnValue(
      chainWithSelect(
        courseDoc({
          enabled: true,
          contentHtml: "<p>Ready?</p>",
        })
      )
    );
    mockEnrollmentFindOne.mockReturnValue(
      chainPlain(enrollmentDoc({ lastLessonId: "l1" }))
    );

    const outline = await getCourseOutlineForUser("U1", "launch-fast");

    expect(outline.hasStarted).toBe(true);
  });
});

describe("getCourseOutlineForUser with a highlighted module", () => {
  const secondLesson = { ...videoLesson, id: "l2", title: "Standalone video" };

  interface HighlightCourse {
    _id: string;
    slug: string;
    title: string;
    courseDetails: {
      modules: {
        id: string;
        title: string;
        isHighlighted?: boolean;
        lessons: (typeof videoLesson)[];
      }[];
    };
  }

  function courseWithHighlight(): HighlightCourse {
    return {
      _id: "CRS1",
      slug: "launch-fast",
      title: "Launch Fast",
      courseDetails: {
        modules: [
          { id: "m1", title: "Orientation", lessons: [videoLesson] },
          { id: "m2", title: "Basics", lessons: [{ ...videoLesson, id: "l3" }] },
          {
            id: "m3",
            title: "Standalone",
            isHighlighted: true,
            lessons: [secondLesson],
          },
        ],
      },
    };
  }

  it("flags the stored module and nothing else", async () => {
    mockProductFindOne.mockReturnValue(chainWithSelect(courseWithHighlight()));
    mockEnrollmentFindOne.mockReturnValue(chainPlain(enrollmentDoc()));

    const outline = await getCourseOutlineForUser("U1", "launch-fast");

    expect(outline.modules.map((module) => module.isHighlighted)).toEqual([
      false,
      false,
      true,
    ]);
    expect(outline.modules[2].lessons[0].moduleId).toBe("m3");
  });

  it("never resolves a highlight onto the orientation module", async () => {
    const course = courseWithHighlight();
    course.courseDetails.modules[0].isHighlighted = true;
    mockProductFindOne.mockReturnValue(chainWithSelect(course));
    mockEnrollmentFindOne.mockReturnValue(chainPlain(enrollmentDoc()));

    const outline = await getCourseOutlineForUser("U1", "launch-fast");

    expect(outline.modules.map((module) => module.isHighlighted)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("collapses duplicate flags to the first eligible module", async () => {
    const course = courseWithHighlight();
    course.courseDetails.modules[1].isHighlighted = true;
    mockProductFindOne.mockReturnValue(chainWithSelect(course));
    mockEnrollmentFindOne.mockReturnValue(chainPlain(enrollmentDoc()));

    const outline = await getCourseOutlineForUser("U1", "launch-fast");

    expect(outline.modules.map((module) => module.isHighlighted)).toEqual([
      false,
      true,
      false,
    ]);
  });
});