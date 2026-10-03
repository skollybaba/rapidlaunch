import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/lib/db";
import {
  LEAD_OFFERINGS,
  LEAD_STATUSES,
  Lead,
  type LeadDoc,
  type LeadOffering,
  type LeadStatus,
} from "@/models/Lead";
import { Product } from "@/models/Product";
import type { ProductDoc } from "@/types/product";

/**
 * Maps a catalogue slug to the lead offering it belongs to. The slug is the
 * server-side source of truth, so a client cannot attribute a submission to a
 * different engagement than the one they submitted through.
 */
const OFFERING_BY_PRODUCT_SLUG: Record<string, LeadOffering> = {
  "90-minute-one-on-one-strategy-session": "90_MIN_STRATEGY_SESSION",
  "idea-to-mvp-sprint": "IDEA_TO_MVP_SPRINT",
  "building-your-product-with-ai": "AI_BUILD_PRICED",
  "build-a-product-with-us": "PRODUCT_BUILD_QUOTE_ONLY",
};

export class LeadServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "LeadServiceError";
    this.status = status;
    this.code = code;
  }
}

function resolveOfferingSlug(slug: string): LeadOffering | undefined {
  return OFFERING_BY_PRODUCT_SLUG[slug];
}

/**
 * Exposed so admin surfaces label enquiries the same way the catalogue does,
 * without re-declaring the slug mapping.
 */
export function offeringForServiceSlug(slug: string): LeadOffering | undefined {
  return resolveOfferingSlug(slug);
}

export interface CreateLeadInput {
  productSlug: string;
  name: string;
  email: string;
  phone?: string | undefined;
  company?: string | undefined;
  website?: string | undefined;
  whatYouAreBuilding?: string | undefined;
  currentStage?: string | undefined;
  helpNeeded?: string | undefined;
  projectScope?: string | undefined;
  requirements?: string | undefined;
  teamSize?: string | undefined;
  timeline?: string | undefined;
  budgetMinor?: number | undefined;
  budgetCurrency?: string | undefined;
}

export interface CreatedLead {
  id: string;
  offering: LeadOffering;
  productTitle: string;
  /** Minor-unit amount payable once scope is confirmed, when a price is listed. */
  quotedPriceMinor?: number | undefined;
  currency: string;
  requiresQuote: boolean;
}

async function loadOfferingProduct(slug: string): Promise<ProductDoc> {
  const product = await Product.findOne({
    slug: slug.toLowerCase(),
    type: "MVP_SERVICE",
    status: "PUBLISHED",
  }).exec();

  if (!product) {
    throw new LeadServiceError(
      404,
      "OFFERING_UNAVAILABLE",
      "This engagement is not currently accepting enquiries."
    );
  }

  const inquiryMode = product.mvpServiceDetails?.inquiryMode ?? "NONE";
  if (inquiryMode === "NONE") {
    throw new LeadServiceError(
      409,
      "OFFERING_UNAVAILABLE",
      "This engagement is not currently accepting enquiries."
    );
  }

  return product;
}

/**
 * Persists a catalogue enquiry. Amounts, currency and offering attribution are
 * read from the product record, never from the submission.
 */
export async function createLead(input: CreateLeadInput): Promise<CreatedLead> {
  await dbConnect();

  const product = await loadOfferingProduct(input.productSlug);
  const inquiryMode = product.mvpServiceDetails?.inquiryMode ?? "NONE";
  const offering = resolveOfferingSlug(product.slug);

  if (!offering) {
    throw new LeadServiceError(
      409,
      "OFFERING_UNAVAILABLE",
      "This engagement is not currently accepting enquiries."
    );
  }

  const requiresQuote = inquiryMode === "QUOTE" || product.priceMinor <= 0;
  const listedPriceMinor = requiresQuote ? undefined : product.priceMinor;

  const lead = await Lead.create({
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone || undefined,
      company: input.company || undefined,
      website: input.website || undefined,
      whatYouAreBuilding: input.whatYouAreBuilding || undefined,
      currentStage: input.currentStage || undefined,
      helpNeeded: input.helpNeeded || undefined,
      projectScope: input.projectScope || undefined,
      requirements: input.requirements || undefined,
      teamSize: input.teamSize || undefined,
      timeline: input.timeline || undefined,
      budgetMinor: input.budgetMinor,
      budgetCurrency: input.budgetCurrency,
      source: "FOUNDERS_CATALOGUE",
      offering,
      status: "NEW",
      productId: new Types.ObjectId(String(product._id)),
    });

  return {
    id: String(lead._id),
    offering,
    productTitle: product.title,
    quotedPriceMinor: listedPriceMinor,
    currency: product.currency,
    requiresQuote,
  };
}

export interface LeadListFilters {
  status?: LeadStatus | undefined;
  offering?: LeadOffering | undefined;
  page?: number;
  pageSize?: number;
}

export interface AdminLeadRow {
  id: string;
  name: string;
  email: string;
  phone?: string | undefined;
  company?: string | undefined;
  website?: string | undefined;
  whatYouAreBuilding?: string | undefined;
  currentStage?: string | undefined;
  helpNeeded?: string | undefined;
  projectScope?: string | undefined;
  requirements?: string | undefined;
  teamSize?: string | undefined;
  timeline?: string | undefined;
  budgetMinor?: number | undefined;
  budgetCurrency?: string | undefined;
  notes?: string | undefined;
  assignedTo?: string | undefined;
  offering: LeadOffering | null;
  status: LeadStatus;
  source: string;
  productTitle: string | null;
  /** Minor-unit amount payable for a priced engagement, when one applies. */
  listedPriceMinor?: number | undefined;
  currency?: string | undefined;
  requiresQuote: boolean;
  createdAt: Date | null;
}

export interface AdminLeadListResult {
  leads: AdminLeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: Record<LeadStatus, number>;
}

export async function listAdminLeads(
  filters: LeadListFilters = {}
): Promise<AdminLeadListResult> {
  await dbConnect();

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

  const match: Record<string, unknown> = {};
  if (filters.status) match.status = filters.status;
  if (filters.offering) match.offering = filters.offering;

  const [docs, total, grouped] = await Promise.all([
    Lead.find(match)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("productId", "title priceMinor currency")
      .lean<LeadDoc[]>()
      .exec(),
    Lead.countDocuments(match),
    Lead.aggregate<{ _id: LeadStatus; count: number }>([
      { $match: filters.status ? { status: filters.status } : {} },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).exec(),
  ]);

  const counts = Object.fromEntries(
    LEAD_STATUSES.map((status) => [status, 0])
  ) as Record<LeadStatus, number>;
  for (const row of grouped) {
    if (row._id in counts) counts[row._id] = row.count;
  }

  return {
    leads: docs.map((doc) => {
      const product = doc.productId as unknown as
        | { title?: string; priceMinor?: number; currency?: string }
        | undefined
        | null;
      const linkedProduct =
        product && typeof product === "object" ? product : undefined;

      return {
        id: String(doc._id),
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        company: doc.company,
        website: doc.website,
        whatYouAreBuilding: doc.whatYouAreBuilding,
        currentStage: doc.currentStage,
        helpNeeded: doc.helpNeeded,
        projectScope: doc.projectScope,
        requirements: doc.requirements,
        teamSize: doc.teamSize,
        timeline: doc.timeline,
        budgetMinor: doc.budgetMinor,
        budgetCurrency: doc.budgetCurrency,
        notes: doc.notes,
        assignedTo: doc.assignedTo,
        offering: doc.offering ?? null,
        status: doc.status,
        source: doc.source,
        productTitle: linkedProduct?.title ?? null,
        listedPriceMinor: linkedProduct?.priceMinor,
        currency: linkedProduct?.currency,
        requiresQuote:
          doc.offering === "PRODUCT_BUILD_QUOTE_ONLY" ||
          !linkedProduct?.priceMinor ||
          linkedProduct.priceMinor <= 0,
        createdAt: doc.createdAt ?? null,
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    counts,
  };
}

export async function getAdminLead(id: string) {
  await dbConnect();

  if (!Types.ObjectId.isValid(id)) return null;

  return Lead.findById(id)
    .populate("productId", "title slug priceMinor currency")
    .lean()
    .exec();
}

export interface UpdateLeadInput {
  status: LeadStatus;
  notes?: string | undefined;
  assignedTo?: string | undefined;
}

export async function updateLead(
  id: string,
  input: UpdateLeadInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  await dbConnect();

  if (!Types.ObjectId.isValid(id)) {
    return { ok: false, message: "That enquiry could not be found." };
  }

  const lead = await Lead.findById(id).exec();
  if (!lead) {
    return { ok: false, message: "That enquiry could not be found." };
  }

  lead.status = input.status;
  if (input.notes !== undefined) lead.notes = input.notes;
  if (input.assignedTo !== undefined) lead.assignedTo = input.assignedTo;

  const now = new Date();
  if (input.status === "CONTACTED" && !lead.contactedAt) lead.contactedAt = now;
  if (input.status === "QUOTED" && !lead.quotedAt) lead.quotedAt = now;
  if (input.status === "CLOSED_WON" || input.status === "CLOSED_LOST") {
    lead.closedAt = now;
  }

  await lead.save();
  return { ok: true };
}

export { LEAD_OFFERINGS, LEAD_STATUSES };