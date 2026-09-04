import "server-only";

import { z } from "zod";

import { dbConnect } from "@/lib/db";
import { createMailAdapter } from "@/lib/providers/mail";
import { readUpload } from "@/lib/storage";
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

export const broadcastEmailSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    subject: z.string().trim().min(1, "Subject is required").max(300),
    body: z.string().trim().min(1, "Body is required").max(20000),
    attachmentKeys: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export interface BroadcastResult {
  recipients: number;
  sent: number;
  failed: number;
}

export async function sendEmailToAllUsers(input: unknown): Promise<BroadcastResult> {
  const parsed = broadcastEmailSchema.parse(input);
  await dbConnect();

  const users = await User.find({ role: { $ne: "admin" } })
    .select("email name")
    .lean()
    .exec();

  const recipients = users.map((u) => u.email);
  if (recipients.length === 0) {
    throw new BroadcastServiceError(
      "NO_RECIPIENTS",
      "There are no customers to email yet.",
      400
    );
  }

  const attachments = [];
  for (const key of parsed.attachmentKeys) {
    const data = await readUpload(key);
    const name = key.split(".")[0] ?? "attachment";
    if (!data) {
      throw new BroadcastServiceError(
        "ATTACHMENT_MISSING",
        `Attachment ${name} could not be loaded.`,
        400
      );
    }
    attachments.push({ filename: name, content: data });
  }

  const mail = createMailAdapter();

  const html = bodyToHtml(parsed.body);
  const text = parsed.body;

  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    try {
      await mail.sendEmail({
        to,
        subject: parsed.subject,
        html,
        text,
        attachments,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { recipients: recipients.length, sent, failed };
}

function bodyToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
  const brand = process.env.MAIL_FROM_NAME
    ? process.env.MAIL_FROM_NAME
    : "Rapid Launch";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#fcfaf8">
    <div style="max-width:600px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#11121d">
      <div style="font-size:18px;font-weight:bold;margin-bottom:16px">${brand}</div>
      <div style="background:#ffffff;border:1px solid #d7d9e5;border-radius:12px;padding:24px;line-height:1.6">${escaped}</div>
    </div></body></html>`;
}
