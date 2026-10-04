import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser: getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const { getCourseOutlineForUser: getOutlineMock } = vi.hoisted(() => ({
  getCourseOutlineForUser: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/services/lms-service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/services/lms-service")>();
  return { ...actual, getCourseOutlineForUser: getOutlineMock };
});

import { NextRequest } from "next/server";

import { GET as documentRoute } from "@/app/api/learn/[slug]/document/route";
import type { CourseOutline } from "@/types/lms";

const outline: CourseOutline = {
  courseId: "course-1",
  courseSlug: "soft-vibe-coding",
  courseTitle: "Soft Vibe Coding",
  modules: [
    {
      id: "m1",
      isOrientation: true,
      title: "Module 1",
      lessons: [
        {
          id: "l1",
          title: "Orientation Material",
          type: "DOCUMENT",
          documentUrl: "https://res.cloudinary.com/demo/raw/upload/quicklaunch/doc",
          documentFileName: "Course Introduction.pdf",
          documentContentType: "application/pdf",
          moduleId: "m1",
          moduleTitle: "Module 1",
          completed: false,
        },
      ],
    },
  ],
  totalLessons: 1,
  completedLessons: 0,
  progressPercent: 0,
  lastLessonId: null,
};

function request(query = "?lessonId=l1") {
  return new NextRequest(
    `http://localhost/api/learn/soft-vibe-coding/document${query}`
  );
}

const params = Promise.resolve({ slug: "soft-vibe-coding" });

describe("GET /api/learn/[slug]/document", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    getCurrentUserMock.mockResolvedValue({ _id: "user-1" });
    getOutlineMock.mockResolvedValue(outline);
  });

  it("rejects unauthenticated requests", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const response = await documentRoute(request(), { params });
    expect(response.status).toBe(401);
  });

  it("requires a lessonId", async () => {
    const response = await documentRoute(request(""), { params });
    expect(response.status).toBe(400);
  });

  it("404s when the lesson is not a document", async () => {
    const response = await documentRoute(request("?lessonId=missing"), { params });
    expect(response.status).toBe(404);
  });

  it("serves the document inline with the corrected URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("PDFDATA", {
        status: 200,
        headers: {
          "content-type": "application/octet-stream",
          "content-length": "7",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await documentRoute(request(), { params });

    expect(fetchMock).toHaveBeenCalledWith(outline.modules[0].lessons[0].documentUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(await response.text()).toBe("PDFDATA");
  });

  it("502s when the stored object cannot be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    );

    const response = await documentRoute(request(), { params });
    expect(response.status).toBe(502);
  });
});
