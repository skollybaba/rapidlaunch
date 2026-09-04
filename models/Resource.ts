import { Schema, model, models, type Model } from "mongoose";

import { RESOURCE_TYPES, type ResourceDoc, type ResourceType, type ResourceStatus } from "@/types/resource";

const ResourceSchema = new Schema<ResourceDoc>(
  {
    type: { type: String, enum: RESOURCE_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    summary: { type: String, trim: true },
    contentHtml: { type: String },
    youtubeUrl: { type: String, trim: true },
    thumbnailUrl: { type: String, trim: true },
    published: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ResourceSchema.index({ published: 1, createdAt: -1 });

export const Resource: Model<ResourceDoc> =
  (models.Resource as Model<ResourceDoc>) ||
  model<ResourceDoc>("Resource", ResourceSchema);

export type { ResourceType, ResourceStatus };
