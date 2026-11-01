import { z } from "zod";

/** Both ids must look like Mongo ObjectIds; existence is checked in the service. */
const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Expected a 24 character id");

export const grantCourseAccessSchema = z
  .object({
    courseId: objectId,
    userId: objectId,
    note: z.string().trim().max(280).optional(),
  })
  .strict();

export type GrantCourseAccessInput = z.infer<typeof grantCourseAccessSchema>;

export const revokeCourseAccessSchema = z
  .object({
    courseId: objectId,
    userId: objectId,
  })
  .strict();

export type RevokeCourseAccessInput = z.infer<typeof revokeCourseAccessSchema>;

export const courseAccessLookupSchema = z
  .object({
    courseId: objectId,
    q: z.string().trim().max(120).optional(),
  })
  .strict();

export type CourseAccessLookupInput = z.infer<typeof courseAccessLookupSchema>;
