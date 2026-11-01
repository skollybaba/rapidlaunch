import "server-only";

import type { PipelineStage } from "mongoose";

/**
 * `fulfillments` and `payments` rows can outlive their parent order. The app has
 * no order-delete path that cascades, and test data is frequently cleared
 * straight from the database, so an order can disappear while its enrollment
 * and payment records remain. Counting those orphans makes the admin dashboard
 * report enrollments, issues and pending payments for purchases that no longer
 * exist.
 *
 * Spread these stages into an aggregate pipeline *before* any `$group` or
 * `$count` so the join still has `orderId` to work with:
 *
 * ```ts
 * Fulfillment.aggregate([
 *   { $match: { status: "FULFILLED" } },
 *   ...liveOrderStages(),
 *   { $count: "count" },
 * ]);
 * ```
 *
 * `getCourseEnrollees` enforces the same rule in memory when it skips
 * fulfillments whose order cannot be found.
 */
export function liveOrderStages(): PipelineStage[] {
  return [
    {
      $lookup: {
        from: "orders",
        localField: "orderId",
        foreignField: "_id",
        as: "__liveOrder",
      },
    },
    { $match: { "__liveOrder.0": { $exists: true } } },
    { $project: { __liveOrder: 0 } },
  ];
}

/** A `$count` aggregate returns a single row; treat a missing row as zero. */
export function countFrom(rows: { count: number }[]): number {
  return rows[0]?.count ?? 0;
}
