/**
 * Report (and optionally purge) rows that point at an order which no longer
 * exists.
 *
 * Orders can be removed straight from the database — the app itself has no
 * order-delete path that cascades — which leaves their fulfillments, payments,
 * bookings and LMS enrollments behind. Those orphans used to inflate the admin
 * dashboard (73 enrollments for 2 real purchases). The dashboard now ignores
 * them at query time, but they still take up space and skew any ad-hoc query,
 * so this script cleans them up.
 *
 * Safe by default: it only prints what it found. Pass --purge to delete.
 *
 *   npm run db:orphans                 # dry run against .env.local
 *   npm run db:orphans -- --purge      # delete
 *
 * Point it at production by overriding the connection for that one command:
 *
 *   MONGODB_URI_MONGODB_URI="<atlas uri>" MONGODB_DB_NAME=quicklaunch \
 *     npm run db:orphans -- --purge
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI_MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME ?? "quicklaunch";
const PURGE = process.argv.includes("--purge");

/** Collections that store an `orderId` foreign key. */
const CHILD_COLLECTIONS = [
  "fulfillments",
  "payments",
  "bookings",
  "enrollments",
] as const;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI_MONGODB_URI is required. Run with `tsx --env-file-if-exists=.env.local scripts/purge-orphans.ts`"
  );
}

const mongoUri: string = MONGODB_URI;

/** Host/db only — never echo credentials into a terminal or a log. */
function targetLabel(uri: string, dbName: string): string {
  try {
    const parsed = new URL(uri);
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}/${dbName}`;
  } catch {
    return `<unparseable uri>/${dbName}`;
  }
}

async function main() {
  console.log(
    `Target: ${targetLabel(mongoUri, DB_NAME)}  |  mode: ${
      PURGE ? "PURGE (destructive)" : "dry run"
    }`
  );

  await mongoose.connect(mongoUri, { dbName: DB_NAME, bufferCommands: false });

  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  const orders = db.collection("orders");
  const orderDocs = await orders
    .find({}, { projection: { _id: 1 } })
    .toArray();
  const liveOrderIds = new Set(orderDocs.map((order) => String(order._id)));

  console.log(`Live orders: ${liveOrderIds.size}\n`);

  let totalOrphans = 0;
  let totalPurged = 0;

  for (const name of CHILD_COLLECTIONS) {
    const collection = db.collection(name);
    const docs = await collection
      .find({}, { projection: { _id: 1, orderId: 1 } })
      .toArray();

    const orphanIds = docs
      .filter((doc) => doc.orderId != null && !liveOrderIds.has(String(doc.orderId)))
      .map((doc) => doc._id);

    totalOrphans += orphanIds.length;

    let purged = 0;
    if (PURGE && orphanIds.length > 0) {
      const result = await collection.deleteMany({ _id: { $in: orphanIds } });
      purged = result.deletedCount ?? 0;
      totalPurged += purged;
    }

    console.log(
      `${name.padEnd(14)} total: ${String(docs.length).padStart(5)}` +
        ` | orphaned: ${String(orphanIds.length).padStart(5)}` +
        (PURGE ? ` | deleted: ${String(purged).padStart(5)}` : "")
    );
  }

  console.log("");

  if (totalOrphans === 0) {
    console.log("No orphans found. Nothing to do.");
  } else if (PURGE) {
    console.log(`Purged ${totalPurged} orphaned row(s).`);
  } else {
    console.log(
      `Found ${totalOrphans} orphaned row(s). Re-run with --purge to delete them.`
    );
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Orphan cleanup failed:", error);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
