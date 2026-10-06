import { Schema, model, type Model } from "mongoose";

export const BROADCAST_SEGMENT_TYPES = [
  "ALL_USERS",
  "COURSE_ENROLLEES",
  "SESSION_REGISTRANTS",
  "PENDING_ORDERS",
  "IMPORTED",
] as const;

export type BroadcastSegmentType = (typeof BROADCAST_SEGMENT_TYPES)[number];

export const BROADCAST_STATUSES = ["COMPLETED", "PARTIAL", "FAILED"] as const;

export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

export interface BroadcastDoc {
  _id: unknown;
  title: string;
  subject: string;
  bodyPreview: string;
  segmentType: BroadcastSegmentType;
  segmentProductTitle: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: BroadcastStatus;
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
    segmentType: {
      type: String,
      enum: BROADCAST_SEGMENT_TYPES,
      required: true,
      index: true,
    },
    segmentProductTitle: { type: String, default: null, trim: true },
    recipientCount: { type: Number, required: true, min: 0 },
    sentCount: { type: Number, required: true, min: 0 },
    failedCount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: BROADCAST_STATUSES, required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

BroadcastSchema.index({ createdAt: -1 });

export const Broadcast: Model<BroadcastDoc> = model<BroadcastDoc>(
  "Broadcast",
  BroadcastSchema,
  undefined,
  { overwriteModels: true }
);
