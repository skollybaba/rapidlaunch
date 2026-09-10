import { z } from "zod";

import { CURRICULUM_MAX_BYTES } from "@/types/product";

export const curriculumUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  size: z
    .number()
    .int()
    .positive()
    .max(CURRICULUM_MAX_BYTES, "Curriculum PDF must be under 10 MB"),
});

export type CurriculumUploadInput = z.infer<typeof curriculumUploadSchema>;

export function isPdfLike(fileName: string, contentType: string): boolean {
  return contentType === "application/pdf" || /\.pdf$/i.test(fileName);
}