import { Schema, model, type Model } from "mongoose";

import {
  LEAD_OFFERINGS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadOffering,
  type LeadSource,
  type LeadStatus,
} from "@/types/lead";

export {
  LEAD_OFFERINGS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadOffering,
  type LeadSource,
  type LeadStatus,
};

export interface LeadDoc {
  _id: unknown;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  whatYouAreBuilding?: string;
  currentStage?: string;
  helpNeeded?: string;
  budgetMinor?: number;
  budgetCurrency?: string;
  timeline?: string;
  projectScope?: string;
  teamSize?: string;
  requirements?: string;
  source: LeadSource;
  offering?: LeadOffering;
  status: LeadStatus;
  assignedTo?: string;
  notes?: string;
  contactedAt?: Date;
  quotedAt?: Date;
  closedAt?: Date;
  closedReason?: string;
  productId?: unknown;
  orderId?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<LeadDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    website: { type: String, trim: true },
    whatYouAreBuilding: { type: String, trim: true },
    currentStage: { type: String, trim: true },
    helpNeeded: { type: String, trim: true },
    projectScope: { type: String, trim: true },
    requirements: { type: String, trim: true },
    teamSize: { type: String, trim: true },
    timeline: { type: String, trim: true },
    budgetMinor: { type: Number, min: 0 },
    budgetCurrency: { type: String, uppercase: true, default: "NGN" },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      required: true,
      default: "FOUNDERS_CATALOGUE",
      index: true,
    },
    offering: {
      type: String,
      enum: LEAD_OFFERINGS,
      index: true,
    },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      required: true,
      default: "NEW",
      index: true,
    },
    assignedTo: { type: String, trim: true },
    notes: { type: String, trim: true },
    contactedAt: { type: Date, default: null },
    quotedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    closedReason: { type: String, trim: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  },
  { timestamps: true }
);

LeadSchema.index({ status: 1, createdAt: -1 });
LeadSchema.index({ email: 1, createdAt: -1 });
LeadSchema.index({ source: 1, createdAt: -1 });

export const Lead: Model<LeadDoc> = model<LeadDoc>(
  "Lead",
  LeadSchema,
  undefined,
  { overwriteModels: true }
);