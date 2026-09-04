import "server-only";

import { dbConnect } from "@/lib/db";
import { Resource } from "@/models/Resource";
import { resourceInputSchema } from "@/lib/validation/resource";
import type { ResourceDoc, ResourceType } from "@/types/resource";

export class ResourceServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ResourceServiceError";
    this.code = code;
    this.status = status;
  }
}

export interface AdminResourceRow {
  id: string;
  type: ResourceType;
  title: string;
  slug: string;
  summary?: string;
  published: boolean;
  thumbnailUrl?: string;
  updatedAt: string;
}

export interface AdminResourceQuery {
  type?: ResourceType;
  q?: string;
  published?: boolean;
}

function asFindFilter(filter: Record<string, unknown>) {
  return filter as unknown as Parameters<typeof Resource.find>[0];
}

export async function getAdminResources(
  query: AdminResourceQuery = {}
): Promise<AdminResourceRow[]> {
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (query.type) filter.type = query.type;
  const trimmed = query.q?.trim();
  if (trimmed) {
    filter.$or = [
      { title: { $regex: trimmed, $options: "i" } },
      { slug: { $regex: trimmed, $options: "i" } },
      { summary: { $regex: trimmed, $options: "i" } },
    ];
  }
  if (typeof query.published === "boolean") filter.published = query.published;

  const docs = await Resource.find(asFindFilter(filter))
    .sort({ updatedAt: -1 })
    .select("_id type title slug summary published thumbnailUrl updatedAt")
    .lean()
    .exec();

  return docs.map((d) => ({
    id: String(d._id),
    type: d.type,
    title: d.title,
    slug: d.slug,
    summary: d.summary,
    published: d.published,
    thumbnailUrl: d.thumbnailUrl,
    updatedAt: (d.updatedAt ?? new Date()).toISOString(),
  }));
}

export async function getPublishedResources(): Promise<ResourceDoc[]> {
  await dbConnect();
  const docs = await Resource.find({ published: true })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  return docs.map((d) => ({ ...d, _id: String(d._id) }));
}

export async function getResourceById(id: string) {
  await dbConnect();
  return Resource.findById(id).lean().exec();
}

export async function getPublishedResourceBySlug(slug: string) {
  await dbConnect();
  return Resource.findOne({ slug, published: true }).lean().exec();
}

export async function createResource(input: unknown) {
  const parsed = resourceInputSchema.parse(input);
  await dbConnect();
  const existing = await Resource.findOne({ slug: parsed.slug })
    .select("_id")
    .lean()
    .exec();
  if (existing) {
    throw new ResourceServiceError("SLUG_IN_USE", "A resource with this slug already exists.", 409);
  }
  return Resource.create(parsed);
}

export async function updateResource(id: string, input: unknown) {
  const parsed = resourceInputSchema.parse(input);
  await dbConnect();
  const slugExists = await Resource.findOne({ slug: parsed.slug, _id: { $ne: id } })
    .select("_id")
    .lean()
    .exec();
  if (slugExists) {
    throw new ResourceServiceError("SLUG_IN_USE", "A resource with this slug already exists.", 409);
  }
  const updated = await Resource.findByIdAndUpdate(id, { $set: parsed }, { new: true })
    .select("_id title slug type")
    .lean()
    .exec();
  if (!updated) {
    throw new ResourceServiceError("RESOURCE_NOT_FOUND", "Resource not found.", 404);
  }
  return updated;
}

export async function deleteResource(id: string): Promise<void> {
  await dbConnect();
  const result = await Resource.findByIdAndDelete(id).exec();
  if (!result) {
    throw new ResourceServiceError("RESOURCE_NOT_FOUND", "Resource not found.", 404);
  }
}
