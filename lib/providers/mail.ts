import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import nodemailer, { type Transporter } from "nodemailer";
import { google } from "googleapis";

export type EmailTemplateKey =
  | "welcome"
  | "account_welcome"
  | "password_reset"
  | "payment_initiated"
  | "payment_successful"
  | "payment_failed"
  | "course_access_fulfilled"
  | "course_access_action_required"
  | "booking_request_received"
  | "booking_confirmed"
  | "booking_reminder"
  | "payment_reminder"
  | "mvp_inquiry_received"
  | "new_lead_notification"
  | "fulfillment_failure_alert"
  | "booking_reschedule_request"
  | "refund_processed"
  | "support_acknowledgement";

export interface EmailAttachmentInput {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachmentInput[];
}

export interface SendEmailResult {
  providerMessageId: string | null;
  sentAt: Date;
}

export interface SendTemplateEmailInput {
  templateKey: EmailTemplateKey;
  to: string;
  variables: Record<string, string>;
}

export interface MailAdapter {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;

  sendTemplateEmail(input: SendTemplateEmailInput): Promise<SendEmailResult>;

  sendTestEmail(): Promise<void>;
}

export interface MailAdapterConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  fromName: string;
  fromEmail?: string;
}

export class MailProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "MailProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

const EMAIL_LOGO_CID = "agile-logo";
let emailLogoCache: EmailAttachmentInput | null | undefined;

function emailBrandLogo(): string {
  return `<img src="cid:${EMAIL_LOGO_CID}" alt="Rapid Launch" width="96" height="44" style="display:block;margin:0 0 10px;width:96px;height:auto;" />`;
}

function emailLogoAttachment(): EmailAttachmentInput | null {
  if (emailLogoCache !== undefined) return emailLogoCache;
  try {
    const file = path.join(
      process.cwd(),
      "public",
      "images",
      "agile_logo-mark.png"
    );
    emailLogoCache = {
      filename: "agile-logo.png",
      cid: EMAIL_LOGO_CID,
      contentType: "image/png",
      content: readFileSync(file),
    };
  } catch {
    emailLogoCache = null;
  }
  return emailLogoCache;
}

function emailAttachments(): EmailAttachmentInput[] {
  const logo = emailLogoAttachment();
  return logo ? [logo] : [];
}

function emailHeader(title: string): string {
  return `<div style="background:#141414;padding:26px 32px;">
  ${emailBrandLogo()}
  <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#ffffff;">${title}</p>
</div>`;
}

function buildTemplate(
  templateKey: EmailTemplateKey,
  variables: Record<string, string>
): { subject: string; html: string; text: string } {
  switch (templateKey) {
    case "payment_successful": {
      const itemTitle = variables.itemTitle ?? "your purchase";
      const orderReference = variables.orderReference ?? "";
      const amount = variables.amount ?? "";
      const nextStep = variables.nextStep ?? "";
      const customerName = variables.customerName ?? "";
      const meetingUrl = variables.meetingUrl ?? "";
      const bookingUrl = variables.bookingUrl ?? "";
      const scheduledAt = variables.scheduledAt ?? "";
      const bookingPending = variables.bookingPending === "true";
      const answerBuilding = variables.answerBuilding ?? "";
      const answerStage = variables.answerStage ?? "";
      const answerHelp = variables.answerHelp ?? "";
      const bonusCourses = variables.bonusCourses ?? "";
      const onlineCourseCount = variables.onlineCourseCount ?? "";
      const greeting = customerName
        ? `Hi ${customerName},`
        : "Hi there,";

      const bookingBlock = meetingUrl
        ? `<a href="${meetingUrl}" style="display:inline-block;padding:12px 20px;margin:4px 0 10px;background:#c75d3c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Join your session</a>
<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#35374a;"><strong style="color:#11121d;">${scheduledAt}</strong></p>
<p style="font-size:13px;line-height:1.6;margin:0 0 12px;color:#74778c;">Your session is on your calendar and runs over Google Meet.</p>`
        : bookingPending
          ? `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#35374a;">Your session time is being confirmed. We will send your meeting link as soon as it is booked.</p>`
          : bookingUrl
            ? `<a href="${bookingUrl}" style="display:inline-block;padding:12px 20px;margin:4px 0 10px;background:#c75d3c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Book your session</a>`
            : `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#35374a;">${nextStep}</p>`;

      const subject = `Payment confirmed for ${itemTitle}`;
      const hasAnswers = Boolean(
        answerBuilding || answerStage || answerHelp
      );
      const answersBlock = hasAnswers
        ? `<p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#c75d3c;font-weight:700;margin:0 0 8px;">Your session details</p>
<table style="width:100%;border:1px solid #eee7de;border-radius:12px;border-collapse:separate;border-spacing:0;margin:0 0 24px;overflow:hidden;">
${answerBuilding ? `<tr><td style="padding:12px 20px;font-size:13px;color:#74778c;border-bottom:1px solid #f3efe8;">What are you building?</td><td style="padding:12px 20px;font-size:13px;font-weight:600;color:#11121d;text-align:right;border-bottom:1px solid #f3efe8;">${answerBuilding}</td></tr>` : ""}
${answerStage ? `<tr><td style="padding:12px 20px;font-size:13px;color:#74778c;border-bottom:1px solid #f3efe8;">Where are you today?</td><td style="padding:12px 20px;font-size:13px;font-weight:600;color:#11121d;text-align:right;border-bottom:1px solid #f3efe8;">${answerStage}</td></tr>` : ""}
${answerHelp ? `<tr><td style="padding:12px 20px;font-size:13px;color:#74778c;">What do you need help with?</td><td style="padding:12px 20px;font-size:13px;font-weight:600;color:#11121d;text-align:right;">${answerHelp}</td></tr>` : ""}
</table>`
        : "";
      const html = `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  ${emailHeader("Payment confirmed")}
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#35374a;">Thank you! Your payment for <strong style="color:#11121d;">${itemTitle}</strong> was successful.</p>
    <table style="width:100%;border:1px solid #eee7de;border-radius:12px;border-collapse:separate;border-spacing:0;margin:0 0 24px;overflow:hidden;">
      <tr><td style="padding:14px 20px;font-size:14px;color:#74778c;border-bottom:1px solid #f3efe8;">Order reference</td><td style="padding:14px 20px;font-size:14px;font-weight:700;color:#11121d;text-align:right;border-bottom:1px solid #f3efe8;">${orderReference}</td></tr>
      <tr><td style="padding:14px 20px;font-size:14px;color:#74778c;">Amount paid</td><td style="padding:14px 20px;font-size:14px;font-weight:700;color:#11121d;text-align:right;">${amount}</td></tr>
    </table>
    <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#c75d3c;font-weight:700;margin:0 0 8px;">Your next step</p>
    ${bookingBlock}
    ${answersBlock}
    ${bonusCourses ? `<p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#c75d3c;font-weight:700;margin:22px 0 6px;">Courses included in this purchase${onlineCourseCount ? ` (${onlineCourseCount})` : ""}</p>
<table style="width:100%;border:1px solid #eee7de;border-radius:12px;border-collapse:separate;border-spacing:0;margin:0 0 6px;overflow:hidden;">
  <tr><td style="padding:12px 20px;font-size:13px;color:#35374a;border-bottom:1px solid #f3efe8;"><strong style="color:#11121d;">${itemTitle}</strong></td><td style="padding:12px 20px;font-size:12px;color:#74778c;text-align:right;border-bottom:1px solid #f3efe8;">Purchased</td></tr>
  <tr><td style="padding:12px 20px;font-size:13px;color:#35374a;"><strong style="color:#11121d;">${bonusCourses}</strong></td><td style="padding:12px 20px;font-size:12px;font-weight:700;color:#c75d3c;text-align:right;">Free bonus</td></tr>
</table>
<p style="font-size:12px;line-height:1.6;margin:0 0 4px;color:#74778c;">Your bonus courses are included at no extra cost. Access invitations land in your inbox shortly.</p>` : ""}
    <p style="font-size:13px;line-height:1.6;margin:22px 0 0;color:#74778c;border-top:1px solid #f3efe8;padding-top:16px;">Questions? Reply to this email or contact our support team.</p>
  </div>
</div>
</div>`;
      const text = `Payment confirmed for ${itemTitle}\n\n${greeting}\n\nThank you! Your payment was successful.\n\nOrder reference: ${orderReference}\nAmount paid: ${amount}\n\n${nextStep}${bonusCourses ? `\n\nCourses included in this purchase:\n- ${itemTitle} (purchased)\n- ${bonusCourses} (free bonus)\n` : ""}${scheduledAt ? `\n\nSession time: ${scheduledAt}` : ""}${meetingUrl ? `\nMeeting link: ${meetingUrl}` : ""}${bookingUrl ? `\nBooking link: ${bookingUrl}` : ""}${hasAnswers ? `\n\nYour session details:\n${answerBuilding ? `\nWhat are you building? ${answerBuilding}` : ""}${answerStage ? `\nWhere are you today? ${answerStage}` : ""}${answerHelp ? `\nWhat do you need help with? ${answerHelp}` : ""}` : ""}\n\nQuestions? Reply to this email or contact our support team.`;
      return { subject, html, text };
    }
    case "booking_request_received": {
      const itemTitle = variables.itemTitle ?? "your session";
      const customerName = variables.customerName ?? "";
      const schedulingUrl = variables.schedulingUrl ?? "";
      const greeting = customerName ? `Hi ${customerName},` : "Hi there,";
      const subject = `Next step: book your ${itemTitle}`;
      const html = `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  ${emailHeader("Book your session")}
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#35374a;">Your payment for <strong style="color:#11121d;">${itemTitle}</strong> is confirmed. To complete your booking, please select a time that works for you.</p>
    ${schedulingUrl ? `<a href="${schedulingUrl}" style="display:inline-block;padding:12px 20px;margin:4px 0 10px;background:#c75d3c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Choose your session time</a>` : `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#35374a;">We will reach out shortly to confirm your session time.</p>`}
    <p style="font-size:13px;line-height:1.6;margin:22px 0 0;color:#74778c;border-top:1px solid #f3efe8;padding-top:16px;">Questions? Reply to this email or contact our support team.</p>
  </div>
</div>
</div>`;
      const text = `Book your ${itemTitle}\n\n${greeting}\n\nYour payment is confirmed. Please select a time that works for you.\n\n${schedulingUrl ? `Choose your session time: ${schedulingUrl}` : "We will reach out shortly to confirm your session time."}\n\nQuestions? Reply to this email or contact our support team.`;
      return { subject, html, text };
    }
    case "booking_reminder": {
      const itemTitle = variables.itemTitle ?? "your session";
      const customerName = variables.customerName ?? "";
      const meetingUrl = variables.meetingUrl ?? "";
      const scheduledAt = variables.scheduledAt ?? "";
      const windowHours = variables.windowHours ?? "24";
      const greeting = customerName ? `Hi ${customerName},` : "Hi there,";
      const timingLabel =
        windowHours === "1"
          ? "Your session starts in about 1 hour"
          : "Your session starts in about 24 hours";
      const detailLabel =
        windowHours === "1"
          ? "Join the call now"
          : "Your live session is coming up tomorrow";
      const subject = `${timingLabel} — ${itemTitle}`;

      const meetingBlock = meetingUrl
        ? `<a href="${meetingUrl}" style="display:inline-block;padding:12px 20px;margin:4px 0 10px;background:#c75d3c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Join your session</a>
<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#35374a;"><strong style="color:#11121d;">${scheduledAt}</strong></p>
<p style="font-size:13px;line-height:1.6;margin:0 0 12px;color:#74778c;">The call runs over Google Meet. Click the button above at the scheduled time.</p>`
        : `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#35374a;">Your session starts at <strong style="color:#11121d;">${scheduledAt}</strong>. We will send the meeting link before the call.</p>`;

      const html = `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  ${emailHeader(`${detailLabel}`)}
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#35374a;">This is a quick reminder about your one-on-one session with Rapid Launch.</p>
    <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#c75d3c;font-weight:700;margin:0 0 8px;">${timingLabel}</p>
    ${meetingBlock}
    <p style="font-size:13px;line-height:1.6;margin:22px 0 0;color:#74778c;border-top:1px solid #f3efe8;padding-top:16px;">Running late or need to reschedule? Reply to this email and we will help.</p>
  </div>
</div>
</div>`;
      const text = `${timingLabel}\n\n${greeting}\n\nThis is a quick reminder about your one-on-one session with Rapid Launch.\n\n${timingLabel}.\n\nSession time: ${scheduledAt}${meetingUrl ? `\nMeeting link: ${meetingUrl}` : ""}\n\nRunning late or need to reschedule? Reply to this email and we will help.`;
      return { subject, html, text };
    }
    case "payment_reminder": {
      const itemTitle = variables.itemTitle ?? "your purchase";
      const customerName = variables.customerName ?? "";
      const checkoutUrl = variables.checkoutUrl ?? "";
      const greeting = customerName ? `Hi ${customerName},` : "Hi there,";
      const subject = `You can still complete your purchase — ${itemTitle}`;
      const html = `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  ${emailHeader("Your purchase is waiting")}
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#35374a;">You started an order for <strong style="color:#11121d;">${itemTitle}</strong> but the payment was not completed. Your place is saved — you can finish checkout whenever you are ready.</p>
    ${checkoutUrl ? `<a href="${checkoutUrl}" style="display:inline-block;padding:12px 20px;margin:4px 0 10px;background:#c75d3c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Complete your purchase</a>` : `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#35374a;">Return to the site and pick this course again when you are ready to continue.</p>`}
    <p style="font-size:13px;line-height:1.6;margin:22px 0 0;color:#74778c;border-top:1px solid #f3efe8;padding-top:16px;">Questions or a better time to purchase? Reply to this email and we will help.</p>
  </div>
</div>
</div>`;
      const text = `Complete your purchase\n\n${greeting}\n\nYou started an order for ${itemTitle} but the payment was not completed. Your place is saved.\n\n${checkoutUrl ? `Finish checkout here: ${checkoutUrl}` : "Return to the site and pick this course again when you are ready."}\n\nQuestions? Reply to this email and we will help.`;
      return { subject, html, text };
    }
    case "account_welcome": {
      const name = variables.name ?? "there";
      const appUrl = variables.appUrl ?? "#";
      const subject = "Welcome to Rapid Launch";
      const html = `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  ${emailHeader("Welcome aboard")}
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">Hi ${name},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#35374a;">Your account is ready. Now your purchases, sessions, and books are kept in one place so you can track everything you've registered for.</p>
    <a href="${appUrl}/account" style="display:inline-block;padding:12px 20px;margin:4px 0 10px;background:#c75d3c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Go to your account</a>
    <p style="font-size:13px;line-height:1.6;margin:22px 0 0;color:#74778c;border-top:1px solid #f3efe8;padding-top:16px;">Questions? Reply to this email and we will help.</p>
  </div>
</div>
</div>`;
      const text = `Welcome to Rapid Launch\n\nHi ${name},\n\nYour account is ready. Your purchases, sessions, and books are now kept in one place.\n\nGo to your account: ${appUrl}/account\n\nQuestions? Reply to this email and we will help.`;
      return { subject, html, text };
    }
    case "password_reset": {
      const name = variables.name ?? "there";
      const resetUrl = variables.resetUrl ?? "#";
      const appUrl = variables.appUrl ?? "#";
      const subject = "Reset your password";
      const html = `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  ${emailHeader("Reset your password")}
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">Hi ${name},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#35374a;">We received a request to reset your password. This link expires in one hour.</p>
    <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;margin:4px 0 10px;background:#c75d3c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Reset your password</a>
    <p style="font-size:13px;line-height:1.6;margin:18px 0 0;color:#74778c;">If you didn't request this, you can safely ignore this email.</p>
    <p style="font-size:13px;line-height:1.6;margin:22px 0 0;color:#74778c;border-top:1px solid #f3efe8;padding-top:16px;">If the button doesn't work, copy this link into your browser: ${resetUrl}. Need help? Visit ${appUrl}/contact.</p>
  </div>
</div>
</div>`;
      const text = `Reset your password\n\nHi ${name},\n\nWe received a request to reset your password. This link expires in one hour.\n\nReset your password: ${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nNeed help? Visit ${appUrl}/contact.`;
      return { subject, html, text };
    }
    case "course_access_fulfilled": {
      const courseTitle = variables.courseTitle ?? variables.itemTitle ?? "your course";
      const customerEmail = variables.customerEmail ?? "";
      const courseUrl = variables.courseUrl ?? "";
      const subject = `You're enrolled: ${courseTitle}`;
      const courseButton = courseUrl
        ? `<a href="${courseUrl}" style="display:inline-block;padding:12px 20px;margin:4px 0 10px;background:#c75d3c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Open your course</a>`
        : `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#35374a;">Your course is available now. Open your account and go to Courses to find the class.</p>`;
      const html = `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  ${emailHeader("You're enrolled")}
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">Hi there,</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#35374a;">You now have access to <strong style="color:#11121d;">${courseTitle}</strong> in the classroom.</p>
    ${courseButton}
    <p style="font-size:13px;line-height:1.6;margin:0 0 12px;color:#74778c;">${customerEmail ? `The invite was sent to <strong>${customerEmail}</strong>.` : ""}</p>
    <p style="font-size:13px;line-height:1.6;margin:22px 0 0;color:#74778c;border-top:1px solid #f3efe8;padding-top:16px;">Questions? Reply to this email or contact our support team.</p>
  </div>
</div>
</div>`;
      const text = `You're enrolled: ${courseTitle}\n\nHi there,\n\nYou now have access to ${courseTitle} in the classroom.\n\nOpen your course: ${courseUrl || "Open your account and go to Courses."}\n\nQuestions? Reply to this email or contact our support team.`;
      return { subject, html, text };
    }
    case "course_access_action_required": {
      const courseTitle = variables.courseTitle ?? variables.itemTitle ?? "your course";
      const subject = `Action needed for ${courseTitle}`;
      const html = `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  ${emailHeader("One more step")}
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">Hi there,</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#35374a;">We're finishing your enrollment into <strong style="color:#11121d;">${courseTitle}</strong>. No action is needed from you — our team will confirm your classroom access and email you once it's ready.</p>
    <p style="font-size:13px;line-height:1.6;margin:22px 0 0;color:#74778c;border-top:1px solid #f3efe8;padding-top:16px;">Questions? Reply to this email or contact our support team.</p>
  </div>
</div>
</div>`;
      const text = `Action needed for ${courseTitle}\n\nHi there,\n\nWe're finishing your enrollment into ${courseTitle}. Our team will confirm your classroom access and email you once it's ready.\n\nQuestions? Reply to this email or contact our support team.`;
      return { subject, html, text };
    }
    case "booking_reschedule_request": {
      const itemTitle = variables.itemTitle ?? "a session";
      const customerName = variables.customerName ?? "";
      const customerEmail = variables.customerEmail ?? "";
      const orderReference = variables.orderReference ?? "";
      const scheduledAt = variables.scheduledAt ?? "";
      const appUrl = variables.appUrl ?? "#";
      const detailLines = [
        { label: "Customer", value: customerName || customerEmail || "—" },
        { label: "Email", value: customerEmail || "—" },
        { label: "Order", value: orderReference || "—" },
        { label: "Current time", value: scheduledAt || "—" },
      ]
        .filter((line) => line.value !== "—")
        .map(
          (line) =>
            `<tr><td style="padding:6px 12px 6px 0;font-size:14px;color:#74778c;white-space:nowrap;vertical-align:top;">${line.label}</td><td style="padding:6px 0;font-size:14px;color:#11121d;font-weight:600;vertical-align:top;">${line.value}</td></tr>`
        )
        .join("");
      const subject = `Reschedule request: ${itemTitle}`;
      const html = detailLines
        ? `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  ${emailHeader("Reschedule request")}
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">A customer has requested a new time for <strong style="color:#11121d;">${itemTitle}</strong>. No refund is due — please confirm a new time.</p>
    <table style="border-collapse:collapse;width:100%;margin:0 0 14px;">${detailLines}</table>
    <a href="${appUrl}/admin/bookings" style="display:inline-block;padding:12px 20px;margin:4px 0 10px;background:#c75d3c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">Review bookings</a>
  </div>
</div>
</div>`
        : "";
      const text = `Reschedule request: ${itemTitle}\n\nA customer has requested a new time for ${itemTitle}. No refund is due — please confirm a new time.\n\n${customerName ? `Customer: ${customerName}\n` : ""}${customerEmail ? `Email: ${customerEmail}\n` : ""}${orderReference ? `Order: ${orderReference}\n` : ""}Current time: ${scheduledAt}\n\nReview bookings: ${appUrl}/admin/bookings`;
      return { subject, html: html || text, text };
    }
    default:
      return {
        subject: "Rapid Launch update",
        html: `<p>${JSON.stringify(variables)}</p>`,
        text: `Rapid Launch update\n${JSON.stringify(variables)}`,
      };
  }
}

export class SmtpMailAdapter implements MailAdapter {
  private readonly transporter: Transporter;
  private readonly fromName: string;
  private readonly fromEmail?: string;

  constructor(private readonly config: MailAdapterConfig) {
    this.fromName = config.fromName;
    this.fromEmail = config.fromEmail;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? { user: config.user, pass: config.password ?? "" }
        : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  private from(): string {
    return this.fromEmail
      ? `"${this.fromName}" <${this.fromEmail}>`
      : this.fromName;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.config.user || !this.config.password) {
      throw new MailProviderError(
        "SMTP_NOT_CONFIGURED",
        "SMTP credentials are not configured",
        false
      );
    }
    try {
      const info = await this.transporter.sendMail({
        from: this.from(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      return {
        providerMessageId: info.messageId ?? null,
        sentAt: new Date(),
      };
    } catch (error) {
      const detail =
        error && typeof error === "object" && "responseCode" in error
          ? ` (${(error as { responseCode: unknown }).responseCode}) ${
              "response" in error
                ? String((error as { response: unknown }).response)
                : ""
            }`
          : "";
      throw new MailProviderError(
        "SMTP_SEND_FAILED",
        `Could not send email${detail}`,
        true
      );
    }
  }

  async sendTemplateEmail(
    input: SendTemplateEmailInput
  ): Promise<SendEmailResult> {
    const template = buildTemplate(input.templateKey, input.variables);
    return this.sendEmail({
      to: input.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments: emailAttachments(),
    });
  }

  async sendTestEmail(): Promise<void> {
    await this.sendEmail({
      to: this.fromEmail ?? this.config.user ?? "",
      subject: "Rapid Launch test email",
      html: `${emailHeader("Rapid Launch test email")}<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;"><div style="padding:28px 32px;"><p style="font-size:15px;line-height:1.6;margin:0;color:#35374a;">This is a test email from Rapid Launch.</p></div></div></div>`,
      text: "This is a test email from Rapid Launch.",
      attachments: emailAttachments(),
    });
  }
}

export interface GmailApiMailAdapterConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fromName: string;
  fromEmail?: string;
}

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function buildRawMessage(
  input: SendEmailInput,
  from: string,
  fromName: string
): string {
  const safeName = fromName.replace(/["\\]/g, "");
  const headers = [
    `From: ${safeName ? `"${safeName}" <${from}>` : from}`,
    `To: ${input.to}`,
    `Subject: ${encodeSubject(input.subject)}`,
    "MIME-Version: 1.0",
    ...(input.replyTo ? [`Reply-To: ${input.replyTo}`] : []),
  ];
  const text = input.text ?? "";
  const html = input.html ?? "";
  const attachments = input.attachments ?? [];

  if (attachments.length === 0) {
    const boundary = `_rl_${Date.now().toString(16)}_boundary`;
    const body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      text,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
      `--${boundary}--`,
    ].join("\r\n");
    return Buffer.from(
      headers
        .concat([`Content-Type: multipart/alternative; boundary="${boundary}"`])
        .join("\r\n") + "\r\n\r\n" + body,
      "utf8"
    ).toString("base64url");
  }

  const mixedBoundary = `_rlm_${Date.now().toString(16)}`;
  const altBoundary = `_rla_${Date.now().toString(16)}`;
  const altBody = [
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text,
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
    `--${altBoundary}--`,
  ].join("\r\n");

  const parts = [
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    altBody,
  ];
  for (const attachment of attachments) {
    parts.push(
      `--${mixedBoundary}`,
      `Content-Type: ${
        attachment.contentType ?? "application/octet-stream"
      }; name="${attachment.filename}"`,
      `Content-Disposition: inline; filename="${attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      ...(attachment.cid ? [`Content-ID: <${attachment.cid}>`] : []),
      "",
      attachment.content.toString("base64")
    );
  }
  parts.push(`--${mixedBoundary}--`);

  return Buffer.from(
    headers
      .concat([`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`])
      .join("\r\n") + "\r\n\r\n" + parts.join("\r\n"),
    "utf8"
  ).toString("base64url");
}

function googleApiErrorDetail(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const code =
    "code" in error && typeof (error as { code: unknown }).code === "number"
      ? String((error as { code: number }).code)
      : "";
  let message = "";
  if ("response" in error) {
    const response = (error as { response: unknown }).response;
    const data =
      response &&
      typeof response === "object" &&
      "data" in response
        ? (response as { data: unknown }).data
        : null;
    const errorInfo =
      data && typeof data === "object" && "error" in data
        ? (data as { error: unknown }).error
        : null;
    if (
      errorInfo &&
      typeof errorInfo === "object" &&
      "message" in errorInfo
    ) {
      message = String(
        (errorInfo as { message?: unknown }).message ?? ""
      );
    }
  }
  return [code, message].filter(Boolean).join(" ");
}

export class GmailApiMailAdapter implements MailAdapter {
  private resolvedSender?: { address: string; name: string };

  constructor(private readonly config: GmailApiMailAdapterConfig) {}

  private gmail() {
    const oauth = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret
    );
    oauth.setCredentials({ refresh_token: this.config.refreshToken });
    return google.gmail({ version: "v1", auth: oauth });
  }

  private async resolveSender(): Promise<{ address: string; name: string }> {
    if (this.resolvedSender) return this.resolvedSender;
    if (this.config.fromEmail) {
      this.resolvedSender = {
        address: this.config.fromEmail,
        name: this.config.fromName,
      };
      return this.resolvedSender;
    }
    const profile = await this.gmail().users.getProfile({ userId: "me" });
    this.resolvedSender = {
      address: profile.data.emailAddress ?? "",
      name: this.config.fromName,
    };
    return this.resolvedSender;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const sender = await this.resolveSender();
    if (!sender.address) {
      throw new MailProviderError(
        "MAIL_NOT_CONFIGURED",
        "No sender email is configured",
        false
      );
    }
    try {
      const raw = buildRawMessage(input, sender.address, sender.name);
      const response = await this.gmail().users.messages.send({
        userId: "me",
        requestBody: { raw },
      });
      return {
        providerMessageId: response.data.id ?? null,
        sentAt: new Date(),
      };
    } catch (error) {
      const detail = googleApiErrorDetail(error);
      throw new MailProviderError(
        "GMAIL_SEND_FAILED",
        `Could not send email${detail ? ` (${detail})` : ""}`,
        true
      );
    }
  }

  async sendTemplateEmail(
    input: SendTemplateEmailInput
  ): Promise<SendEmailResult> {
    const template = buildTemplate(input.templateKey, input.variables);
    return this.sendEmail({
      to: input.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments: emailAttachments(),
    });
  }

  async sendTestEmail(): Promise<void> {
    const sender = await this.resolveSender();
    await this.sendEmail({
      to: sender.address,
      subject: "Rapid Launch test email",
      html: `${emailHeader("Rapid Launch test email")}<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;"><div style="padding:28px 32px;"><p style="font-size:15px;line-height:1.6;margin:0;color:#35374a;">This is a test email from Rapid Launch.</p></div></div></div>`,
      text: "This is a test email from Rapid Launch.",
      attachments: emailAttachments(),
    });
  }
}

export function createMailAdapter(config?: MailAdapterConfig): MailAdapter {
  const transport = (process.env.MAIL_TRANSPORT || "auto").toLowerCase();
  const hasSmtp = Boolean(
    process.env.GOOGLE_SMTP_USER && process.env.GOOGLE_SMTP_PASSWORD
  );
  const hasGmailOAuth = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );

  if (
    transport === "gmail_api" ||
    (transport === "auto" && !hasSmtp && hasGmailOAuth)
  ) {
    return new GmailApiMailAdapter({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
      fromName: process.env.MAIL_FROM_NAME || "Rapid Launch",
      fromEmail: process.env.MAIL_FROM_EMAIL,
    });
  }

  const cfg: MailAdapterConfig = config ?? {
    host: process.env.GOOGLE_SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.GOOGLE_SMTP_PORT || 465),
    secure: Number(process.env.GOOGLE_SMTP_PORT || 465) === 465,
    user: process.env.GOOGLE_SMTP_USER,
    password: process.env.GOOGLE_SMTP_PASSWORD,
    fromName: process.env.MAIL_FROM_NAME || "Rapid Launch",
    fromEmail: process.env.MAIL_FROM_EMAIL,
  };
  return new SmtpMailAdapter(cfg);
}