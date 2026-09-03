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
  "CLASSROOM",
  "DOWNLOAD",
  "EXTERNAL",
  "SCHEDULER",
  "MANUAL",
] as const;

export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export interface ProductCourseDetails {
  instructor?: string;
  durationMinutes?: number;
  level?: string;
  audience?: string[];
  outcomes?: string[];
  syllabus?: string[];
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

export interface ProductMvpServiceDetails {
  scope?: string;
  deliverables?: string[];
  quoteMode?: boolean;
  startingPriceMinor?: number;
  maxDepositMinor?: number;
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