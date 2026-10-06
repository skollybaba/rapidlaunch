import { Schema, model, type Model } from "mongoose";

export const BROADCAST_SEGMENT_TYPES = [
  "ALL_USERS",
  "COURSE_ENROLLEES",
  "SESSION_REGISTRANTS",
  "PENDING_ORDERS",
  "IMPORTED",
] as const;

export type BroadcastSegmentType = (typeof BROADCAST_SEGMENT_TYPES)[number];

export const BROADCAST_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
] as const;

export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

export interface BroadcastDoc {
  _id: unknown;
  title: string;
  subject: string;
  bodyPreview: string;
  /** Full sanitized HTML, kept for scheduled sends. Excluded from default queries. */
  bodyHtml: string;
  segmentType: BroadcastSegmentType;
  segmentProductTitle: string | null;
  segmentProductId: string | null;
  importedRecipients: unknown;
  attachmentKeys: string[];
  attachmentName: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: BroadcastStatus;
  scheduledFor: Date | null;
  dispatchingAt: Date | null;
  createdByUserId: unknown;
  createdByEmail: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BroadcastSchema = new Schema<BroadcastDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    bodyPreview: { type: String, default: "", trim: true, maxlength: 400 },
    bodyHtml: { type: String, default: "", select: false },
    segmentType: {
      type: String,
      enum: BROADCAST_SEGMENT_TYPES,
      required: true,
      index: true,
    },
    segmentProductTitle: { type: String, default: null, trim: true },
    segmentProductId: { type: String, default: null, trim: true },
    importedRecipients: { type: Schema.Types.Mixed, default: null },
    attachmentKeys: { type: [String], default: [] },
    attachmentName: { type: String, default: null, trim: true },
    recipientCount: { type: Number, required: true, min: 0 },
    sentCount: { type: Number, required: true, min: 0 },
    failedCount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: BROADCAST_STATUSES, required: true },
    scheduledFor: { type: Date, default: null },
    dispatchingAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

BroadcastSchema.index({ createdAt: -1 });
// Drives "which scheduled sends are due?" and the pending badge count.
BroadcastSchema.index({ status: 1, scheduledFor: 1 });

export const Broadcast: Model<BroadcastDoc> = model<BroadcastDoc>(
  "Broadcast",
  BroadcastSchema,
  undefined,
  { overwriteModels: true }
);
