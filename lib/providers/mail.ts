import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

export type EmailTemplateKey =
  | "welcome"
  | "payment_initiated"
  | "payment_successful"
  | "payment_failed"
  | "course_access_fulfilled"
  | "course_access_action_required"
  | "booking_request_received"
  | "booking_confirmed"
  | "booking_reminder"
  | "mvp_inquiry_received"
  | "new_lead_notification"
  | "fulfillment_failure_alert"
  | "refund_processed"
  | "support_acknowledgement";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
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
      const html = `<div style="background:#fcfaf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee7de;border-radius:16px;overflow:hidden;">
  <div style="background:#141414;padding:26px 32px;">
    <p style="margin:0;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#c75d3c;font-weight:700;">Rapid Launch</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#ffffff;">Payment confirmed</p>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:16px;line-height:1.6;margin:0 0 18px;color:#11121d;">${greeting}</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#35374a;">Thank you! Your payment for <strong style="color:#11121d;">${itemTitle}</strong> was successful.</p>
    <table style="width:100%;border:1px solid #eee7de;border-radius:12px;border-collapse:separate;border-spacing:0;margin:0 0 24px;overflow:hidden;">
      <tr><td style="padding:14px 20px;font-size:14px;color:#74778c;border-bottom:1px solid #f3efe8;">Order reference</td><td style="padding:14px 20px;font-size:14px;font-weight:700;color:#11121d;text-align:right;border-bottom:1px solid #f3efe8;">${orderReference}</td></tr>
      <tr><td style="padding:14px 20px;font-size:14px;color:#74778c;">Amount paid</td><td style="padding:14px 20px;font-size:14px;font-weight:700;color:#11121d;text-align:right;">${amount}</td></tr>
    </table>
    <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#c75d3c;font-weight:700;margin:0 0 8px;">Your next step</p>
    ${bookingBlock}
    <p style="font-size:13px;line-height:1.6;margin:22px 0 0;color:#74778c;border-top:1px solid #f3efe8;padding-top:16px;">Questions? Reply to this email or contact our support team.</p>
  </div>
</div>
</div>`;
      const text = `Payment confirmed for ${itemTitle}\n\n${greeting}\n\nThank you! Your payment was successful.\n\nOrder reference: ${orderReference}\nAmount paid: ${amount}\n\n${nextStep}${scheduledAt ? `\n\nSession time: ${scheduledAt}` : ""}${meetingUrl ? `\nMeeting link: ${meetingUrl}` : ""}${bookingUrl ? `\nBooking link: ${bookingUrl}` : ""}\n\nQuestions? Reply to this email or contact our support team.`;
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
  <div style="background:#141414;padding:26px 32px;">
    <p style="margin:0;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#c75d3c;font-weight:700;">Rapid Launch</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#ffffff;">${detailLabel}</p>
  </div>
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
      });
      return {
        providerMessageId: info.messageId ?? null,
        sentAt: new Date(),
      };
    } catch {
      throw new MailProviderError(
        "SMTP_SEND_FAILED",
        "Could not send email",
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
    });
  }

  async sendTestEmail(): Promise<void> {
    await this.sendEmail({
      to: this.fromEmail ?? this.config.user ?? "",
      subject: "Rapid Launch test email",
      html: "<p>This is a test email from Rapid Launch.</p>",
      text: "This is a test email from Rapid Launch.",
    });
  }
}

export function createMailAdapter(config?: MailAdapterConfig): MailAdapter {
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