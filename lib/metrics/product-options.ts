import "server-only";

import dbConnect from "@/lib/db";
import { Product } from "@/models/Product";
import type { MetricProductOption } from "@/lib/metrics/product-filter";

/**
 * Every product the admin can filter metrics by.
 *
 * Archived products stay in the list because they still own historical orders
 * and enrollments; hiding them would make those numbers unreachable.
 */
export async function getMetricProductOptions(): Promise<
  MetricProductOption[]
> {
  await dbConnect();

  const products = await Product.find({})
    .sort({ type: 1, title: 1 })
    .select("_id title type status")
    .lean()
    .exec();

  return products.map((product) => ({
    id: String(product._id),
    title: product.title,
    type: product.type,
    status: product.status,
  }));
}
