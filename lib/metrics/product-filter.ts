import { Types } from "mongoose";

/**
 * Product scoping for the admin metrics pages.
 *
 * Every metrics query can be narrowed to a single product so the owner can ask
 * "how is this course doing?" instead of only reading whole-business totals.
 * The URL contract is `?product=<id>` alongside `window`/`start`/`end`, so a
 * product and a date range compose.
 */

export const PRODUCT_FILTER_PARAM = "product";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export interface ProductFilter {
  /** Canonical string form, used for string columns like AnalyticsEvent. */
  id: string;
  /** ObjectId form, used for every `*Id` column in the business collections. */
  objectId: Types.ObjectId;
}

export interface MetricProductOption {
  id: string;
  title: string;
  type: string;
  status: string;
}

/**
 * Reads a product id from an untrusted value. A malformed id is treated as "no
 * filter" rather than an error, so a stale or hand-edited URL still renders the
 * whole-business view instead of a broken page.
 */
export function resolveProductFilter(
  value?: string | null
): ProductFilter | null {
  const trimmed = (value ?? "").trim();
  if (!OBJECT_ID_PATTERN.test(trimmed)) return null;
  return { id: trimmed, objectId: new Types.ObjectId(trimmed) };
}

/** Same as {@link resolveProductFilter} but takes a whole metrics input object. */
export function productFilterFrom(
  input?: string | { product?: string } | null
): ProductFilter | null {
  if (!input || typeof input === "string") return null;
  return resolveProductFilter(input.product);
}
