import type { CourseModule } from "@/types/lms";

export const PRODUCT_TYPES = [
  "COURSE",
  "BOOK",
  "CONSULTATION",
  "MVP_SERVICE",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const FULFILLMENT_MODES = [
  "LMS",
  "CLASSROOM",
  "DOWNLOAD",
  "EXTERNAL",
  "SCHEDULER",
  "MANUAL",
] as const;

export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export const ADMIN_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export const CURRICULUM_MAX_BYTES = ADMIN_UPLOAD_MAX_BYTES;

export interface ProductCurriculum {
  fileName: string;
  contentType: "application/pdf";
  size: number;
  uploadedAt?: Date | null;
}

export interface ProductCurriculumStored extends ProductCurriculum {
  data: Buffer;
}

export interface ProductCourseDetails {
  instructor?: string;
  instructorImageUrl?: string;
  instructorUrl?: string;
  durationMinutes?: number;
  level?: string;
  audience?: string[];
  outcomes?: string[];
  syllabus?: string[];
  /**
   * Ordered curriculum for courses delivered through the LMS. Authoritative
   * over `syllabus`, which is kept as the short public summary shown on the
   * sales page.
   */
  modules?: CourseModule[];
  previewUrl?: string;
  classroomCourseId?: string;
  courseJoinUrl?: string;
  enrollmentMode?: "AUTOMATIC" | "MANUAL";
  accessInstructions?: string;
}

export interface ProductBookDetails {
  author?: string;
  isbn?: string;
  format?: string;
  deliveryMode?: "DIGITAL_DOWNLOAD" | "PHYSICAL" | "EXTERNAL";
  assetKey?: string;
  externalUrl?: string;
  previewUrl?: string;
  inventoryMode?: "UNLIMITED" | "TRACKED";
  stockQuantity?: number;
}

export interface ProductConsultationDetails {
  sessionTypes?: string[];
  durationMinutes?: number;
  bookingMode?: "EXTERNAL_SCHEDULER" | "MANUAL";
  schedulerUrl?: string;
  preparationInstructions?: string;
  reschedulePolicy?: string;
  cancellationPolicy?: string;
}

export type ProductInquiryMode = "NONE" | "INTEREST" | "QUOTE";

export interface ProductMvpServiceDetails {
  scope?: string;
  deliverables?: string[];
  quoteMode?: boolean;
  startingPriceMinor?: number;
  maxDepositMinor?: number;
  /**
   * When set, the catalogue CTA opens an enquiry form instead of checkout.
   * INTEREST collects scope confirmation before a listed price is payable;
   * QUOTE collects a brief and prices the engagement manually.
   */
  inquiryMode?: ProductInquiryMode;
}

export interface ProductDoc {
  _id: unknown;
  type: ProductType;
  slug: string;
  title: string;
  shortDescription?: string;
  description?: string;
  status: ProductStatus;
  priceMinor: number;
  currency: string;
  fulfillmentMode?: FulfillmentMode;
  thumbnailUrl?: string;
  mediaUrls: string[];
  featured: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  courseDetails?: ProductCourseDetails | null;
  bookDetails?: ProductBookDetails | null;
  consultationDetails?: ProductConsultationDetails | null;
  mvpServiceDetails?: ProductMvpServiceDetails | null;
  curriculum?: ProductCurriculum | null;
  bundleCourseIds?: unknown[];
  publishedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductSummary {
  id: string;
  type: ProductType;
  slug: string;
  title: string;
  shortDescription?: string;
  status: ProductStatus;
  priceMinor: number;
  currency: string;
  fulfillmentMode?: FulfillmentMode;
  thumbnailUrl?: string;
  featured: boolean;
}

export type ProductDetail = ProductDoc & { id: string };