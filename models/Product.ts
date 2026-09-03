import { Schema, model, models, type Model } from "mongoose";

import type { ProductCourseDetails, ProductDoc } from "@/types/product";

const courseDetailsSchema = new Schema<ProductCourseDetails>(
  {
    instructor: String,
    durationMinutes: Number,
    level: String,
    audience: [String],
    outcomes: [String],
    syllabus: [String],
    previewUrl: String,
    classroomCourseId: String,
    courseJoinUrl: String,
    enrollmentMode: { type: String, enum: ["AUTOMATIC", "MANUAL"] },
    accessInstructions: String,
  },
  { _id: false }
);

const bookDetailsSchema = new Schema(
  {
    author: String,
    isbn: String,
    format: String,
    deliveryMode: {
      type: String,
      enum: ["DIGITAL_DOWNLOAD", "PHYSICAL", "EXTERNAL"],
    },
    assetKey: String,
    externalUrl: String,
    previewUrl: String,
    inventoryMode: { type: String, enum: ["UNLIMITED", "TRACKED"] },
    stockQuantity: Number,
  },
  { _id: false }
);

const consultationDetailsSchema = new Schema(
  {
    sessionTypes: [String],
    durationMinutes: Number,
    bookingMode: { type: String, enum: ["EXTERNAL_SCHEDULER", "MANUAL"] },
    schedulerUrl: String,
    preparationInstructions: String,
    reschedulePolicy: String,
    cancellationPolicy: String,
  },
  { _id: false }
);

const mvpServiceDetailsSchema = new Schema(
  {
    scope: String,
    deliverables: [String],
    quoteMode: Boolean,
    startingPriceMinor: Number,
    maxDepositMinor: Number,
  },
  { _id: false }
);

const ProductSchema = new Schema<ProductDoc>(
  {
    type: {
      type: String,
      enum: ["COURSE", "BOOK", "CONSULTATION", "MVP_SERVICE"],
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, trim: true },
    description: String,
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    priceMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "NGN", uppercase: true },
    fulfillmentMode: {
      type: String,
      enum: ["CLASSROOM", "DOWNLOAD", "EXTERNAL", "SCHEDULER", "MANUAL"],
    },
    thumbnailUrl: String,
    mediaUrls: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    seoTitle: String,
    seoDescription: String,
    courseDetails: courseDetailsSchema,
    bookDetails: bookDetailsSchema,
    consultationDetails: consultationDetailsSchema,
    mvpServiceDetails: mvpServiceDetailsSchema,
    publishedAt: Date,
  },
  { timestamps: true }
);

ProductSchema.index({ status: 1, type: 1, sortOrder: 1, title: 1 });

export const Product: Model<ProductDoc> =
  (models.Product as Model<ProductDoc>) ||
  model<ProductDoc>("Product", ProductSchema);

export default Product;