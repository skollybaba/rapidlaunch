import { z } from "zod";

import { RESOURCE_TYPES } from "@/types/resource";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const resourceInputSchema = z
  .object({
    type: z.enum(RESOURCE_TYPES),
    title: z.string().trim().min(1, "Title is required").max(200),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(slugRegex, "Slug may contain only lowercase letters, numbers, and hyphens"),
    summary: z.string().trim().max(400).optional(),
    contentHtml: z.string().optional(),
    youtubeUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    thumbnailUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    published: z.boolean().default(false),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.type === "VIDEO" && !data.youtubeUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Videos require a YouTube URL",
        path: ["youtubeUrl"],
      });
    }
  });

export type ResourceInput = z.infer<typeof resourceInputSchema>;
