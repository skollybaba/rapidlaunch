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
      const subject = `Payment confirmed — ${itemTitle}`;
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:520px;margin:0 auto;padding:24px;">
<h1 style="font-size:22px;margin:0 0 16px;">Payment confirmed 🎉</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi there,</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Thank you! Your payment for <strong>${itemTitle}</strong> was successful.</p>
<table style="width:100%;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 16px;border-collapse:collapse;">
<tr><td style="padding:10px 14px;font-size:14px;color:#475569;">Order reference</td><td style="padding:10px 14px;font-size:14px;font-weight:bold;">${orderReference}</td></tr>
<tr><td style="padding:10px 14px;font-size:14px;color:#475569;">Amount paid</td><td style="padding:10px 14px;font-size:14px;font-weight:bold;">${amount}</td></tr>
</table>
<p style="font-size:16px;line-height:1.6;margin:0 0 16px;">${nextStep}</p>
<p style="font-size:13px;color:#94a3b8;margin:0;">If you have any questions, just reply to this email or contact our support team.</p>
</div>`;
      const text = `Payment confirmed — ${itemTitle}\n\nThank you! Your payment was successful.\n\nOrder reference: ${orderReference}\nAmount paid: ${amount}\n\n${nextStep}\n\nIf you have any questions, contact our support team.`;
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