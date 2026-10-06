import "server-only";

import mongoose from "mongoose";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import { sanitizeEmailHtml } from "@/lib/rich-content";
import { brandLogoAttachments, createMailAdapter } from "@/lib/providers/mail";
import { readUpload } from "@/lib/storage";
import { buildBroadcastEmail } from "@/lib/services/broadcast-template";
import {
  validateImportedRecipients,
  type ParsedRecipient,
} from "@/lib/validation/recipients";
import {
  BROADCAST_SEGMENT_TYPES,
  Broadcast,
  type BroadcastSegmentType,
  type BroadcastStatus,
} from "@/models/Broadcast";
import { Booking } from "@/models/Booking";
import { Enrollment } from "@/models/Enrollment";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";

export class BroadcastServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "BroadcastServiceError";
    this.code = code;
    this.status = status;
  }
}

export interface BroadcastRecipient {
  email: string;
  name?: string;
}

export interface SegmentProductOption {
  id: string;
  title: string;
}

export interface BroadcastOptions {
  counts: {
    allUsers: number;
    courseEnrollees: number;
    sessionRegistrants: number;
    pendingOrders: number;
  };
  courses: SegmentProductOption[];
  sessions: SegmentProductOption[];
  orderProducts: SegmentProductOption[];
}

export interface BroadcastResult {
  recipients: number;
  sent: number;
  failed: number;
  broadcastId: string;
  status: BroadcastStatus;
  /** ISO timestamp, present when the campaign was scheduled rather than sent. */
  scheduledFor?: string;
}

export interface BroadcastActor {
  userId: string | null;
  email: string;
}

export interface BroadcastHistoryRow {
  id: string;
  title: string;
  subject: string;
  segmentLabel: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdByEmail: string;
  createdAt: string;
}

export interface BroadcastScheduledRow {
  id: string;
  title: string;
  subject: string;
  segmentLabel: string;
  recipientCount: number;
  status: string;
  scheduledFor: string;
  createdByEmail: string;
}

export const broadcastSendSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    subject: z.string().trim().min(1, "Subject is required").max(300),
    bodyHtml: z.string().trim().min(1, "Body is required").max(40000),
    segmentType: z.enum(BROADCAST_SEGMENT_TYPES),
    productId: z.string().trim().min(1).optional(),
    importedRecipients: z.unknown().optional(),
    attachmentKeys: z.array(z.string().trim().min(1)).max(5).default([]),
    attachmentName: z.string().trim().max(200).optional(),
    scheduledFor: z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid schedule time")
      .optional(),
  })
  .strict();

const NOT_PARSABLE = ["CANCELLED", "FAILED"] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mergeRecipients(lists: BroadcastRecipient[][]): BroadcastRecipient[] {
  const byEmail = new Map<string, BroadcastRecipient>();
  for (const list of lists) {
    for (const recipient of list) {
      const email = normalizeEmail(recipient.email);
      if (!email) continue;
      const name = recipient.name?.trim();
      const existing = byEmail.get(email);
      if (!existing) {
        byEmail.set(email, name ? { email, name } : { email });
      } else if (!existing.name && name) {
        existing.name = name;
      }
    }
  }
  return [...byEmail.values()];
}

async function resolveSegment(
  segmentType: BroadcastSegmentType,
  productId?: string
): Promise<BroadcastRecipient[]> {
  if (segmentType === "ALL_USERS") {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("email name")
      .lean()
      .exec();
    return users.map((u) => ({ email: u.email, name: u.name ?? undefined }));
  }

  if (segmentType === "COURSE_ENROLLEES") {
    const enrollments = await Enrollment.find({
      status: "ACTIVE",
      ...(productId ? { courseId: productId } : {}),
    })
      .select("userId")
      .lean()
      .exec();
    const userIds = enrollments
      .map((e) => e.userId)
      .filter((id): id is NonNullable<typeof id> => Boolean(id));
    if (userIds.length === 0) return [];
    const users = await User.find({ _id: { $in: userIds } })
      .select("email name")
      .lean()
      .exec();
    return users.map((u) => ({ email: u.email, name: u.name ?? undefined }));
  }

  if (segmentType === "SESSION_REGISTRANTS") {
    const bookings = await Booking.find({
      status: { $nin: [...NOT_PARSABLE] },
      ...(productId ? { productId } : {}),
    })
      .select("customerEmail customerName")
      .lean()
      .exec();
    return bookings.map((b) => ({
      email: b.customerEmail,
      name: b.customerName ?? undefined,
    }));
  }

  if (segmentType === "PENDING_ORDERS") {
    const orders = await Order.find({
      status: "PENDING",
      ...(productId ? { "items.productId": productId } : {}),
    })
      .select("customerEmail userId")
      .lean()
      .exec();
    const userIds = orders
      .map((o) => o.userId)
      .filter((id): id is NonNullable<typeof id> => Boolean(id));
    const namesByEmail = new Map<string, string>();
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds } })
        .select("email name")
        .lean()
        .exec();
      for (const u of users) {
        if (u.name) namesByEmail.set(normalizeEmail(u.email), u.name);
      }
    }
    return orders.map((o) => {
      const name = namesByEmail.get(normalizeEmail(o.customerEmail));
      return name ? { email: o.customerEmail, name } : { email: o.customerEmail };
    });
  }

  throw new BroadcastServiceError(
    "UNKNOWN_SEGMENT",
    "Unknown audience segment.",
    400
  );
}

async function segmentCount(segmentType: BroadcastSegmentType): Promise<number> {
  switch (segmentType) {
    case "ALL_USERS":
      return User.countDocuments({ role: { $ne: "admin" } });
    case "COURSE_ENROLLEES": {
      const ids = await Enrollment.distinct("userId", { status: "ACTIVE" });
      return ids.length;
    }
    case "SESSION_REGISTRANTS": {
      const emails = await Booking.distinct("customerEmail", {
        status: { $nin: [...NOT_PARSABLE] },
      });
      return emails.length;
    }
    case "PENDING_ORDERS": {
      const emails = await Order.distinct("customerEmail", {
        status: "PENDING",
      });
      return emails.length;
    }
    default:
      return 0;
  }
}

function serializeProduct(doc: { _id: unknown; title: string }): SegmentProductOption {
  return { id: String(doc._id), title: doc.title };
}

/** Audience counts and dropdown data for the segment picker. */
export async function getBroadcastOptions(): Promise<BroadcastOptions> {
  await dbConnect();

  const [allUsers, courseEnrollees, sessionRegistrants, pendingOrders] =
    await Promise.all([
      segmentCount("ALL_USERS"),
      segmentCount("COURSE_ENROLLEES"),
      segmentCount("SESSION_REGISTRANTS"),
      segmentCount("PENDING_ORDERS"),
    ]);

  const courses = await Product.find({ type: "COURSE" })
    .select("title")
    .sort({ title: 1 })
    .lean()
    .exec();
  const sessions = await Product.find({ type: "CONSULTATION" })
    .select("title")
    .sort({ title: 1 })
    .lean()
    .exec();
  const pendingOrderDocs = await Order.find({ status: "PENDING" })
    .select("items.productId")
    .lean()
    .exec();

  const pendingProductIds = [
    ...new Set(
      pendingOrderDocs.flatMap((order) =>
        order.items.map((item) => String(item.productId))
      )
    ),
  ];
  const orderProducts = pendingProductIds.length
    ? (
        await Product.find({ _id: { $in: pendingProductIds } })
          .select("title")
          .sort({ title: 1 })
          .lean()
          .exec()
      ).map(serializeProduct)
    : [];

  return {
    counts: { allUsers, courseEnrollees, sessionRegistrants, pendingOrders },
    courses: courses.map(serializeProduct),
    sessions: sessions.map(serializeProduct),
    orderProducts,
  };
}

const SEGMENT_LABELS: Record<BroadcastSegmentType, string> = {
  ALL_USERS: "All users",
  COURSE_ENROLLEES: "Course enrollees",
  SESSION_REGISTRANTS: "Session registrants",
  PENDING_ORDERS: "Pending orders",
  IMPORTED: "Imported list",
};

export async function countRecipientsForSegment(
  segmentType: BroadcastSegmentType,
  productId?: string
): Promise<number> {
  await dbConnect();

  if (segmentType === "ALL_USERS") {
    return User.countDocuments({ role: { $ne: "admin" } });
  }
  if (segmentType === "COURSE_ENROLLEES") {
    const ids = await Enrollment.distinct("userId", {
      status: "ACTIVE",
      ...(productId ? { courseId: productId } : {}),
    });
    return ids.length;
  }
  if (segmentType === "SESSION_REGISTRANTS") {
    const emails = await Booking.distinct("customerEmail", {
      status: { $nin: [...NOT_PARSABLE] },
      ...(productId
        ? { productId: new mongoose.Types.ObjectId(productId) }
        : {}),
    });
    return emails.length;
  }
  if (segmentType === "PENDING_ORDERS") {
    const orders = await Order.find({ status: "PENDING" })
      .select("customerEmail items")
      .lean()
      .exec();
    const emails = new Set<string>();
    for (const order of orders) {
      const email = order.customerEmail?.trim().toLowerCase();
      if (!email) continue;
      if (productId) {
        const hasProduct = order.items.some((item) =>
          String(item.productId) === String(productId)
        );
        if (!hasProduct) continue;
      }
      emails.add(email);
    }
    return emails.size;
  }
  return 0;
}


export function segmentLabel(
  segmentType: BroadcastSegmentType,
  productTitle?: string | null
): string {
  if (
    productTitle &&
    segmentType !== "ALL_USERS" &&
    segmentType !== "IMPORTED"
  ) {
    return `${SEGMENT_LABELS[segmentType]}: ${productTitle}`;
  }
  return SEGMENT_LABELS[segmentType];
}

/**
 * Replaces `{{name}}` and `{{email}}` tokens. Pass `html: true` when the
 * surrounding string is HTML so names cannot inject markup.
 */
export function applyPersonalization(
  template: string,
  recipient: BroadcastRecipient,
  options: { html?: boolean } = {}
): string {
  const rawName = (recipient.name ?? "").trim();
  const name = rawName || "there";
  const escape = options.html
    ? (value: string) =>
        value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
    : (value: string) => value;
  return template
    .replace(/\{\{\s*name\s*\}\}/gi, () => escape(name))
    .replace(/\{\{\s*email\s*\}\}/gi, () => escape(recipient.email));
}

const SAMPLE_PREVIEW_RECIPIENT: BroadcastRecipient = {
  name: "Ada",
  email: "ada@example.com",
};

function hostedLogoUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  return base ? `${base}/images/agile_logo.png` : null;
}

/**
 * Sanitizes editor HTML and wraps it in the brand shell with a sample
 * recipient. Used by preview, so `{{name}}`/`{{email}}` tokens and the logo
 * render the way a real recipient would see them.
 */
export function renderBroadcastEmail(input: {
  title: string;
  bodyHtml: string;
  subject?: string;
}): { html: string; text: string; subject: string } {
  const recipient = SAMPLE_PREVIEW_RECIPIENT;
  const bodyHtml = sanitizeEmailHtml(input.bodyHtml);
  const headline = applyPersonalization(input.title, recipient, {
    html: true,
  });
  const personalizedBody = applyPersonalization(bodyHtml, recipient, {
    html: true,
  });
  const subject = applyPersonalization(input.subject ?? "", recipient);
  const { html, text } = buildBroadcastEmail({
    headline,
    bodyHtml: personalizedBody,
  });
  const hosted = hostedLogoUrl();
  return {
    html: hosted ? html.replaceAll("cid:agile-logo", hosted) : html,
    text,
    subject,
  };
}

interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/**
 * Loads stored attachment keys. Missing files abort the request by default;
 * dispatch passes `tolerateMissing` so one lost file cannot wedge a campaign
 * in retries forever (it is logged instead).
 */
async function loadAttachments(
  keys: string[],
  attachmentName: string | null | undefined,
  options: { tolerateMissing?: boolean } = {}
): Promise<MailAttachment[]> {
  const attachments: MailAttachment[] = [];
  for (const key of keys) {
    const data = await readUpload(key);
    if (!data) {
      if (options.tolerateMissing) {
        console.error("Broadcast attachment missing", { key });
        continue;
      }
      throw new BroadcastServiceError(
        "ATTACHMENT_MISSING",
        `Attachment ${attachmentName ?? key} could not be loaded.`,
        400
      );
    }
    attachments.push({
      filename: attachmentName ?? key,
      content: data,
      ...(key.toLowerCase().endsWith(".pdf")
        ? { contentType: "application/pdf" }
        : {}),
    });
  }
  return attachments;
}

/** Personalises and delivers one campaign body to every resolved recipient. */
async function deliverToRecipients(params: {
  title: string;
  subject: string;
  bodyHtml: string;
  recipients: BroadcastRecipient[];
  attachments: MailAttachment[];
}): Promise<{ sent: number; failed: number }> {
  const mail = createMailAdapter();
  const logoAttachments = brandLogoAttachments();

  let sent = 0;
  let failed = 0;
  for (const recipient of params.recipients) {
    try {
      const subject = applyPersonalization(params.subject, recipient);
      const personalizedBody = applyPersonalization(params.bodyHtml, recipient, {
        html: true,
      });
      const personalizedTitle = applyPersonalization(params.title, recipient, {
        html: true,
      });
      const { html, text } = buildBroadcastEmail({
        headline: personalizedTitle,
        bodyHtml: personalizedBody,
      });
      await mail.sendEmail({
        to: recipient.email,
        subject,
        html,
        text,
        attachments: [...logoAttachments, ...params.attachments],
      });
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

function bodyPreviewOf(bodyHtml: string): string {
  return bodyHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

/**
 * Sends a campaign now, or — when `scheduledFor` is in the future — stores it
 * as a SCHEDULED broadcast for the dispatch runner to fire later. Recipients
 * are always resolved up front so an empty audience fails fast at compose time.
 */
export async function sendBroadcast(
  input: unknown,
  actor: BroadcastActor
): Promise<BroadcastResult> {
  const parsed = broadcastSendSchema.parse(input);
  await dbConnect();

  const bodyHtml = sanitizeEmailHtml(parsed.bodyHtml);
  if (!bodyHtml.trim()) {
    throw new BroadcastServiceError(
      "EMPTY_BODY",
      "The email body is empty after sanitizing.",
      400
    );
  }

  const scheduledDate = parsed.scheduledFor
    ? new Date(parsed.scheduledFor)
    : null;
  if (scheduledDate && scheduledDate.getTime() <= Date.now()) {
    throw new BroadcastServiceError(
      "SCHEDULED_IN_PAST",
      "Pick a date and time in the future to schedule this email.",
      400
    );
  }

  let imported: ParsedRecipient[] | undefined;
  if (parsed.segmentType === "IMPORTED") {
    try {
      imported = validateImportedRecipients(parsed.importedRecipients);
    } catch (error) {
      throw new BroadcastServiceError(
        "INVALID_IMPORT",
        error instanceof Error ? error.message : "Imported list is invalid.",
        400
      );
    }
  } else if (parsed.importedRecipients !== undefined) {
    throw new BroadcastServiceError(
      "UNEXPECTED_IMPORT",
      "Imported recipients are only allowed for the imported-list segment.",
      400
    );
  }

  const resolved =
    parsed.segmentType === "IMPORTED"
      ? []
      : await resolveSegment(parsed.segmentType, parsed.productId);
  const recipients = mergeRecipients(imported ? [imported, resolved] : [resolved]);
  if (recipients.length === 0) {
    throw new BroadcastServiceError(
      "NO_RECIPIENTS",
      "There are no recipients in this audience yet.",
      400
    );
  }

  let segmentProductTitle: string | null = null;
  if (parsed.productId && parsed.segmentType !== "IMPORTED") {
    const product = await Product.findById(parsed.productId).select("title").lean().exec();
    segmentProductTitle = product?.title ?? null;
  }

  // Validated now so a bad key surfaces at compose time, not at send time.
  const attachments = await loadAttachments(
    parsed.attachmentKeys,
    parsed.attachmentName
  );

  const baseDoc = {
    title: parsed.title,
    subject: parsed.subject,
    bodyPreview: bodyPreviewOf(bodyHtml),
    bodyHtml,
    segmentType: parsed.segmentType,
    segmentProductTitle,
    segmentProductId: parsed.productId ?? null,
    importedRecipients:
      parsed.segmentType === "IMPORTED" ? (imported ?? null) : null,
    attachmentKeys: parsed.attachmentKeys,
    attachmentName: parsed.attachmentName ?? null,
    recipientCount: recipients.length,
    createdByUserId: actor.userId,
    createdByEmail: actor.email,
  };

  if (scheduledDate) {
    const broadcast = await Broadcast.create({
      ...baseDoc,
      sentCount: 0,
      failedCount: 0,
      status: "SCHEDULED",
      scheduledFor: scheduledDate,
    });
    return {
      recipients: recipients.length,
      sent: 0,
      failed: 0,
      broadcastId: String(broadcast._id),
      status: "SCHEDULED",
      scheduledFor: scheduledDate.toISOString(),
    };
  }

  const { sent, failed } = await deliverToRecipients({
    title: parsed.title,
    subject: parsed.subject,
    bodyHtml,
    recipients,
    attachments,
  });

  const status: BroadcastStatus =
    failed === 0 ? "COMPLETED" : sent === 0 ? "FAILED" : "PARTIAL";

  const broadcast = await Broadcast.create({
    ...baseDoc,
    sentCount: sent,
    failedCount: failed,
    status,
  });

  return {
    recipients: recipients.length,
    sent,
    failed,
    broadcastId: String(broadcast._id),
    status,
  };
}

export interface DeliverScheduledResult {
  delivered: boolean;
  /** Another runner owns the claim, or the broadcast already left SCHEDULED. */
  skipped: boolean;
  recipients: number;
  sent: number;
  failed: number;
  /** Terminal reason when the campaign can no longer go out. */
  error?: string;
}

/**
 * Fires one scheduled broadcast. Atomically claims it first so the in-process
 * timer, the cron endpoint and any manual trigger cannot double-send; the
 * audience is re-resolved at send time because segments are live.
 */
export async function deliverScheduledBroadcast(
  broadcastId: string
): Promise<DeliverScheduledResult> {
  await dbConnect();

  const claimed = await Broadcast.findOneAndUpdate(
    { _id: broadcastId, status: "SCHEDULED", dispatchingAt: null },
    { $set: { dispatchingAt: new Date() } },
    { new: true }
  )
    .select("+bodyHtml")
    .lean()
    .exec();

  if (!claimed) {
    return { delivered: false, skipped: true, recipients: 0, sent: 0, failed: 0 };
  }

  const release = async (set: Record<string, unknown>): Promise<void> => {
    await Broadcast.updateOne(
      { _id: claimed._id },
      { $set: { ...set, dispatchingAt: null } }
    );
  };

  try {
    const bodyHtml = (claimed.bodyHtml ?? "").trim();
    if (!bodyHtml) {
      await release({ status: "FAILED" });
      return {
        delivered: false,
        skipped: false,
        recipients: 0,
        sent: 0,
        failed: 0,
        error: "The email body is missing.",
      };
    }

    let imported: ParsedRecipient[] | undefined;
    if (claimed.segmentType === "IMPORTED") {
      try {
        imported = validateImportedRecipients(claimed.importedRecipients);
      } catch (error) {
        await release({ status: "FAILED" });
        return {
          delivered: false,
          skipped: false,
          recipients: 0,
          sent: 0,
          failed: 0,
          error:
            error instanceof Error
              ? error.message
              : "The imported list is no longer valid.",
        };
      }
    }

    const resolved =
      claimed.segmentType === "IMPORTED"
        ? []
        : await resolveSegment(claimed.segmentType, claimed.segmentProductId ?? undefined);
    const recipients = mergeRecipients(
      imported ? [imported, resolved] : [resolved]
    );
    if (recipients.length === 0) {
      await release({ status: "FAILED", recipientCount: 0 });
      return {
        delivered: false,
        skipped: false,
        recipients: 0,
        sent: 0,
        failed: 0,
        error: "There are no recipients in this audience.",
      };
    }

    const attachments = await loadAttachments(
      claimed.attachmentKeys ?? [],
      claimed.attachmentName,
      { tolerateMissing: true }
    );

    const { sent, failed } = await deliverToRecipients({
      title: claimed.title,
      subject: claimed.subject,
      bodyHtml,
      recipients,
      attachments,
    });

    const status: BroadcastStatus =
      failed === 0 ? "COMPLETED" : sent === 0 ? "FAILED" : "PARTIAL";

    await Broadcast.updateOne(
      { _id: claimed._id },
      {
        $set: {
          status,
          recipientCount: recipients.length,
          sentCount: sent,
          failedCount: failed,
          dispatchingAt: null,
        },
      }
    );

    return {
      delivered: true,
      skipped: false,
      recipients: recipients.length,
      sent,
      failed,
    };
  } catch (error) {
    // Free the claim so a later tick retries, but never swallow the error.
    await Broadcast.updateOne(
      { _id: claimed._id },
      { $set: { dispatchingAt: null } }
    );
    throw error;
  }
}

function mapHistoryRow(row: {
  _id: unknown;
  title: string;
  subject: string;
  segmentType: BroadcastSegmentType;
  segmentProductTitle: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdByEmail: string;
  createdAt?: Date;
}): BroadcastHistoryRow {
  return {
    id: String(row._id),
    title: row.title,
    subject: row.subject,
    segmentLabel: segmentLabel(row.segmentType, row.segmentProductTitle),
    recipientCount: row.recipientCount,
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    status: row.status,
    createdByEmail: row.createdByEmail,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
  };
}

/** Recent campaign log for the history table, excluding pending scheduled sends. */
export async function listBroadcasts(limit = 20): Promise<BroadcastHistoryRow[]> {
  await dbConnect();
  const rows = await Broadcast.find({ status: { $ne: "SCHEDULED" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();

  return rows.map(mapHistoryRow);
}

/** Scheduled campaigns that have not gone out yet, soonest first. */
export async function listScheduledBroadcasts(
  limit = 20
): Promise<BroadcastScheduledRow[]> {
  await dbConnect();
  const rows = await Broadcast.find({ status: "SCHEDULED" })
    .sort({ scheduledFor: 1 })
    .limit(limit)
    .lean()
    .exec();

  return rows.map((row) => ({
    id: String(row._id),
    title: row.title,
    subject: row.subject,
    segmentLabel: segmentLabel(row.segmentType, row.segmentProductTitle),
    recipientCount: row.recipientCount,
    status: row.status,
    scheduledFor: row.scheduledFor
      ? new Date(row.scheduledFor).toISOString()
      : "",
    createdByEmail: row.createdByEmail,
  }));
}

/** Drives the pending badge on the Scheduled tab. */
export async function countPendingScheduledBroadcasts(): Promise<number> {
  await dbConnect();
  return Broadcast.countDocuments({ status: "SCHEDULED" });
}