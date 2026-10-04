import { z } from "zod";

import { LESSON_TYPES } from "@/types/lms";
import { parseYouTubeId } from "@/lib/youtube";

/**
 * Admin-authoritative identifiers for modules and lessons. They are used as
 * the key progress is stored against, so they must be stable and URL-safe.
 */
const contentId = z
  .string()
  .trim()
  .min(1, "Required")
  .max(80, "Too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens"
  );

const safeHttpUrl = z
  .string()
  .trim()
  .min(1, "Required")
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    },
    "Must be an http or https URL"
  );

const lessonSchema = z
  .object({
    id: contentId,
    title: z.string().trim().min(1, "Title is required").max(160),
    type: z.enum(LESSON_TYPES),
    description: z.string().trim().max(2000).optional(),
    youtubeUrl: z.string().trim().optional(),
    documentUrl: safeHttpUrl.optional(),
    documentFileName: z.string().trim().max(255).optional(),
    documentSizeBytes: z.number().int().nonnegative().optional(),
    documentContentType: z.string().trim().max(120).optional(),
    linkUrl: safeHttpUrl.optional(),
    durationMinutes: z.number().int().nonnegative().max(600).optional(),
    isPreview: z.boolean().optional(),
  })
  .superRefine((lesson, ctx) => {
    // Each lesson kind requires its own source, and must not carry a source
    // belonging to another kind, so a stale field cannot leak into rendering.
    if (lesson.type === "VIDEO") {
      if (!lesson.youtubeUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A video lesson needs a YouTube link",
          path: ["youtubeUrl"],
        });
      } else if (!parseYouTubeId(lesson.youtubeUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a link to a single YouTube video",
          path: ["youtubeUrl"],
        });
      }
      if (lesson.documentUrl || lesson.linkUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A video lesson cannot also carry a document or link",
        });
      }
    }

    if (lesson.type === "DOCUMENT") {
      if (!lesson.documentUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A document lesson needs an uploaded file",
          path: ["documentUrl"],
        });
      }
      if (lesson.youtubeUrl || lesson.linkUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A document lesson cannot also carry a video or link",
        });
      }
    }

    if (lesson.type === "LINK") {
      if (!lesson.linkUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A link lesson needs a URL",
          path: ["linkUrl"],
        });
      }
      if (lesson.youtubeUrl || lesson.documentUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A link lesson cannot also carry a video or document",
        });
      }
    }
  });

export const courseModuleSchema = z.object({
  id: contentId,
  title: z.string().trim().min(1, "Module title is required").max(160),
  description: z.string().trim().max(2000).optional(),
  lessons: z.array(lessonSchema).max(200, "Too many lessons in one module"),
  isOrientation: z.boolean().optional(),
});

export const courseModulesSchema = z
  .array(courseModuleSchema)
  .max(60, "Too many modules");

/**
 * Rejects duplicate module and lesson ids within a course.
 *
 * Progress is keyed on these ids, so a collision would make two different
 * lessons share one completion record.
 */
export function assertUniqueContentIds(modules: z.infer<typeof courseModuleSchema>[]) {
  const moduleIds = new Set<string>();
  const lessonIds = new Set<string>();
  const duplicates: string[] = [];

  for (const mod of modules) {
    if (moduleIds.has(mod.id)) duplicates.push(`module "${mod.id}"`);
    moduleIds.add(mod.id);

    for (const lesson of mod.lessons) {
      if (lessonIds.has(lesson.id)) duplicates.push(`lesson "${lesson.id}"`);
      lessonIds.add(lesson.id);
    }
  }

  return duplicates;
}

/**
 * Turns a free-form admin title into a stable content id.
 */
export function slugifyContentId(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || fallback;
}