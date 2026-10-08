import { describe, expect, it } from "vitest";

import { beforeYouStartSchema } from "@/lib/validation/lms";
import { courseEntryLessonId } from "@/types/lms";

const GOOD_VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

describe("beforeYouStartSchema", () => {
  it("accepts a disabled page with no content", () => {
    expect(beforeYouStartSchema.parse({ enabled: false })).toEqual({
      enabled: false,
    });
  });

  it("accepts an enabled page with only a video", () => {
    const parsed = beforeYouStartSchema.parse({
      enabled: true,
      youtubeUrl: GOOD_VIDEO,
    });
    expect(parsed.youtubeUrl).toBe(GOOD_VIDEO);
  });

  it("accepts an enabled page with only body copy", () => {
    const parsed = beforeYouStartSchema.parse({
      enabled: true,
      contentHtml: "<p>Welcome.</p>",
    });
    expect(parsed.contentHtml).toBe("<p>Welcome.</p>");
  });

  it("accepts a full page with a CTA pair", () => {
    const parsed = beforeYouStartSchema.parse({
      enabled: true,
      title: "Welcome",
      youtubeUrl: GOOD_VIDEO,
      contentHtml: "<p>Ready?</p>",
      ctaLabel: "Join the group",
      ctaUrl: "https://chat.whatsapp.com/abc",
    });
    expect(parsed.ctaLabel).toBe("Join the group");
  });

  it("accepts a root-relative CTA destination", () => {
    const parsed = beforeYouStartSchema.parse({
      enabled: true,
      contentHtml: "<p>x</p>",
      ctaLabel: "Preview",
      ctaUrl: "/account/courses",
    });
    expect(parsed.ctaUrl).toBe("/account/courses");
  });

  it("rejects an enabled page with no video and no content", () => {
    const result = beforeYouStartSchema.safeParse({ enabled: true });
    expect(result.success).toBe(false);
  });

  it("rejects a non-single-video YouTube link", () => {
    const result = beforeYouStartSchema.safeParse({
      enabled: true,
      youtubeUrl: "https://www.youtube.com/playlist?list=PL123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-YouTube URL as the video", () => {
    const result = beforeYouStartSchema.safeParse({
      enabled: true,
      contentHtml: "<p>x</p>",
      youtubeUrl: "https://example.com/video.mp4",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a CTA label without a destination", () => {
    const result = beforeYouStartSchema.safeParse({
      enabled: true,
      contentHtml: "<p>x</p>",
      ctaLabel: "Join",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a CTA destination without a label", () => {
    const result = beforeYouStartSchema.safeParse({
      enabled: true,
      contentHtml: "<p>x</p>",
      ctaUrl: "https://chat.whatsapp.com/abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe CTA scheme", () => {
    const result = beforeYouStartSchema.safeParse({
      enabled: true,
      contentHtml: "<p>x</p>",
      ctaLabel: "Open",
      ctaUrl: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an overlong title", () => {
    const result = beforeYouStartSchema.safeParse({
      enabled: true,
      contentHtml: "<p>x</p>",
      title: "a".repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it("points the video error at the youtubeUrl field", () => {
    const result = beforeYouStartSchema.safeParse({
      enabled: true,
      contentHtml: "<p>x</p>",
      youtubeUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "youtubeUrl")).toBe(
        true
      );
    }
  });
});

describe("courseEntryLessonId", () => {
  function lesson(id: string) {
    return { id, title: id, type: "VIDEO" as const, isPreview: false };
  }

  it("returns the first playable lesson of the first module (orientation)", () => {
    const id = courseEntryLessonId([
      { lessons: [lesson("preview-first"), lesson("l1")] },
      { lessons: [lesson("l2")] },
    ]);
    expect(id).toBe("preview-first");
  });

  it("uses the same module when orientation is off (module 1)", () => {
    const id = courseEntryLessonId([{ lessons: [lesson("m1-l1")] }]);
    expect(id).toBe("m1-l1");
  });

  it("skips preview lessons so a gated course still starts real content", () => {
    const id = courseEntryLessonId([
      { lessons: [{ ...lesson("vip-only"), isPreview: true }, lesson("real")] },
    ]);
    expect(id).toBe("real");
  });

  it("returns null when there are no modules or lessons", () => {
    expect(courseEntryLessonId([])).toBeNull();
    expect(courseEntryLessonId([{ lessons: [{ ...lesson("only"), isPreview: true }] }])).toBeNull();
  });
});