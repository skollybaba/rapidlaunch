import "server-only";

import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { slugify } from "@/lib/utils";
import { productListQuerySchema } from "@/lib/validation/product";
import type {
  ProductDetail,
  ProductDoc,
  ProductSummary,
  ProductType,
} from "@/types/product";

type LeanProduct = ProductDoc & { __v?: number };

function toSummary(doc: LeanProduct): ProductSummary {
  return {
    id: String(doc._id),
    type: doc.type,
    slug: doc.slug,
    title: doc.title,
    shortDescription: doc.shortDescription,
    status: doc.status,
    priceMinor: doc.priceMinor,
    currency: doc.currency,
    fulfillmentMode: doc.fulfillmentMode,
    thumbnailUrl: doc.thumbnailUrl,
    featured: doc.featured,
  };
}

function toDetail(doc: LeanProduct): ProductDetail {
  return {
    ...doc,
    id: String(doc._id),
  } as ProductDetail;
}

type ProductFilter = Record<string, unknown>;

function publishedFilter(type?: ProductType): ProductFilter {
  const filter: ProductFilter = { status: "PUBLISHED" };
  if (type) filter.type = type;
  return filter;
}

function toFindFilter(filter: ProductFilter) {
  return filter as unknown as Parameters<typeof Product.find>[0];
}

function toFindOneFilter(filter: ProductFilter) {
  return filter as unknown as Parameters<typeof Product.findOne>[0];
}

export interface ListPublishedProductsInput {
  type?: ProductType;
  limit?: number;
}

export async function listPublishedProducts(
  input: ListPublishedProductsInput = {}
): Promise<ProductSummary[]> {
  await dbConnect();

  const { type, limit } = productListQuerySchema.parse({
    type: input.type,
    limit: input.limit ?? 50,
  });

  const docs = await Product.find(toFindFilter(publishedFilter(type)))
    .sort({ sortOrder: 1, title: 1 })
    .limit(limit)
    .select("-curriculum.data")
    .lean()
    .exec();

  return docs.map(toSummary);
}

export interface BundleCourseSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  durationMinutes?: number;
}

export type CourseDetail = ProductDetail & {
  bundleCourses: BundleCourseSummary[];
  hasCurriculum: boolean;
};

async function loadBundleCourses(
  doc: LeanProduct
): Promise<BundleCourseSummary[]> {
  const ids = Array.isArray(doc.bundleCourseIds)
    ? doc.bundleCourseIds.map(String).filter(Boolean)
    : [];
  if (ids.length === 0) return [];

  const courses = await Product.find(
    toFindFilter({
      _id: { $in: ids },
      type: "COURSE",
      status: "PUBLISHED",
    })
  )
    .select(
      "_id slug title shortDescription thumbnailUrl courseDetails.durationMinutes"
    )
    .lean()
    .exec();

  return courses.map((c) => ({
    id: String(c._id),
    slug: c.slug,
    title: c.title,
    shortDescription: c.shortDescription,
    thumbnailUrl: c.thumbnailUrl,
    durationMinutes: c.courseDetails?.durationMinutes,
  }));
}

export async function getPublishedProductBySlug(
  slug: string,
  type?: ProductType
): Promise<CourseDetail | null> {
  await dbConnect();

  const filter = publishedFilter(type);
  filter.slug = slugify(slug);

  const doc = await Product.findOne(toFindOneFilter(filter))
    .select("-curriculum.data")
    .lean()
    .exec();

  if (!doc) return null;
  return {
    ...toDetail(doc),
    hasCurriculum: Boolean(doc.curriculum?.fileName),
    bundleCourses: await loadBundleCourses(doc),
  };
}

export async function getPublishedProductById(
  id: string
): Promise<ProductDetail | null> {
  if (!id) return null;

  await dbConnect();

  const doc = await Product.findOne(
    toFindOneFilter({ _id: id, status: "PUBLISHED" })
  )
    .select("-curriculum.data")
    .lean()
    .exec();

  return doc ? toDetail(doc) : null;
}

export async function getRelatedProducts(
  product: Pick<ProductDetail, "id" | "type">,
  limit = 3
): Promise<ProductSummary[]> {
  await dbConnect();

  const filter = publishedFilter(product.type);
  filter._id = { $ne: product.id };

  const docs = await Product.find(toFindFilter(filter))
    .sort({ sortOrder: 1, title: 1 })
    .limit(limit)
    .select("-curriculum.data")
    .lean()
    .exec();

  return docs.map(toSummary);
}