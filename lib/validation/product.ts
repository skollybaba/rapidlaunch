import { z } from "zod";

import {
  FULFILLMENT_MODES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
} from "@/types/product";

const courseDetailsInputSchema = z
  .object({
    instructor: z.string().min(1).optional(),
    durationMinutes: z.number().int().positive().optional(),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
    audience: z.array(z.string().min(1)).optional(),
    outcomes: z.array(z.string().min(1)).optional(),
    syllabus: z.array(z.string().min(1)).optional(),
    previewUrl: z.string().url().optional(),
    classroomCourseId: z.string().min(1).optional(),
    courseJoinUrl: z.string().url().optional(),
    enrollmentMode: z.enum(["AUTOMATIC", "MANUAL"]).optional(),
    accessInstructions: z.string().optional(),
  })
  .strict();

const bookDetailsInputSchema = z
  .object({
    author: z.string().min(1).optional(),
    isbn: z.string().optional(),
    format: z.string().optional(),
    deliveryMode: z
      .enum(["DIGITAL_DOWNLOAD", "PHYSICAL", "EXTERNAL"])
      .optional(),
    assetKey: z.string().min(1).optional(),
    externalUrl: z.string().url().optional(),
    previewUrl: z.string().url().optional(),
    inventoryMode: z.enum(["UNLIMITED", "TRACKED"]).optional(),
    stockQuantity: z.number().int().min(0).optional(),
  })
  .strict();

const consultationDetailsInputSchema = z
  .object({
    sessionTypes: z.array(z.string().min(1)).optional(),
    durationMinutes: z.number().int().positive().optional(),
    bookingMode: z.enum(["EXTERNAL_SCHEDULER", "MANUAL"]).optional(),
    schedulerUrl: z.string().url().optional(),
    preparationInstructions: z.string().optional(),
    reschedulePolicy: z.string().optional(),
    cancellationPolicy: z.string().optional(),
  })
  .strict();

const mvpServiceDetailsInputSchema = z
  .object({
    scope: z.string().min(1).optional(),
    deliverables: z.array(z.string().min(1)).optional(),
    quoteMode: z.boolean().optional(),
    startingPriceMinor: z.number().int().min(0).optional(),
    maxDepositMinor: z.number().int().min(0).optional(),
  })
  .strict();

export const productInputSchema = z
  .object({
    type: z.enum(PRODUCT_TYPES),
    slug: z
      .string()
      .min(1)
      .max(200)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug may contain only lowercase letters, numbers, and hyphens"
      ),
    title: z.string().min(1).max(200),
    shortDescription: z.string().max(300).optional(),
    description: z.string().optional(),
    status: z.enum(PRODUCT_STATUSES),
    priceMinor: z.number().int().min(0),
    currency: z.string().length(3).default("NGN"),
    fulfillmentMode: z.enum(FULFILLMENT_MODES).optional(),
    thumbnailUrl: z.string().url().optional(),
    mediaUrls: z.array(z.string().url()).default([]),
    featured: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    courseDetails: courseDetailsInputSchema.optional(),
    bookDetails: bookDetailsInputSchema.optional(),
    consultationDetails: consultationDetailsInputSchema.optional(),
    mvpServiceDetails: mvpServiceDetailsInputSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status !== "PUBLISHED") return;

    const isQuoteBasedMvp =
      data.type === "MVP_SERVICE" && data.mvpServiceDetails?.quoteMode === true;
    const isExternallyFulfilled = data.fulfillmentMode === "EXTERNAL";

    if (data.priceMinor <= 0 && !isQuoteBasedMvp && !isExternallyFulfilled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Published products must have a positive price unless they are quote-based MVPs or fulfilled by an external store",
        path: ["priceMinor"],
      });
    }

    if (!data.fulfillmentMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Published products must define a fulfillment mode",
        path: ["fulfillmentMode"],
      });
    }

    switch (data.type) {
      case "COURSE": {
        const manual =
          data.fulfillmentMode === "MANUAL" ||
          data.courseDetails?.enrollmentMode === "MANUAL";
        if (!manual && !data.courseDetails?.classroomCourseId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Published courses require a classroom course ID unless enrollment is manual",
            path: ["courseDetails", "classroomCourseId"],
          });
        }
        break;
      }
      case "BOOK": {
        if (!data.bookDetails?.deliveryMode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Published books require a delivery mode",
            path: ["bookDetails", "deliveryMode"],
          });
        }
        break;
      }
      case "CONSULTATION": {
        if (!data.consultationDetails?.bookingMode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Published consultations require a booking mode",
            path: ["consultationDetails", "bookingMode"],
          });
        }
        break;
      }
      case "MVP_SERVICE": {
        if (!data.mvpServiceDetails?.scope) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Published MVP services require a scope summary",
            path: ["mvpServiceDetails", "scope"],
          });
        }
        break;
      }
    }
  });

export const productListQuerySchema = z.object({
  type: z.enum(PRODUCT_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;