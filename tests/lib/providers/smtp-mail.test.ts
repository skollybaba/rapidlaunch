import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(),
}));

vi.mock("nodemailer", () => {
  createTransport.mockImplementation(() => ({ sendMail }));
  return {
    default: { createTransport },
    createTransport,
  };
});

import {
  MailProviderError,
  SmtpMailAdapter,
  createMailAdapter,
} from "@/lib/providers/mail";

const CONFIG = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "owner@gmail.com",
  password: "app-password",
  fromName: "Agile Minds Hub",
  fromEmail: "owner@gmail.com",
};

let adapter: SmtpMailAdapter;

beforeEach(() => {
  vi.clearAllMocks();
  sendMail.mockResolvedValue({ messageId: "smtp-msg-1" });
  adapter = new SmtpMailAdapter(CONFIG);
});

describe("SmtpMailAdapter", () => {
  it("connects on port 465 with implicit TLS and authenticated credentials", () => {
    const adapter = new SmtpMailAdapter(CONFIG);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: "owner@gmail.com", pass: "app-password" },
      })
    );
    expect(adapter).toBeInstanceOf(SmtpMailAdapter);
  });

  it("sends html and plain text with a formatted sender", async () => {
    const result = await adapter.sendEmail({
      to: "student@gmail.com",
      subject: "Welcome to the course",
      html: "<p>Hi</p>",
      text: "Hi",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Agile Minds Hub" <owner@gmail.com>',
        to: "student@gmail.com",
        subject: "Welcome to the course",
        html: "<p>Hi</p>",
        text: "Hi",
      })
    );
    expect(result.providerMessageId).toBe("smtp-msg-1");
    expect(result.sentAt).toBeInstanceOf(Date);
  });

  it("embeds the brand logo inline via cid in template emails", async () => {
    await adapter.sendTemplateEmail({
      templateKey: "account_welcome",
      to: "student@gmail.com",
      variables: { name: "Ade", appUrl: "https://example.com" },
    });

    const payload = sendMail.mock.calls[0][0];
    expect(payload.html).toContain('src="cid:agile-logo"');
    expect(payload.attachments).toEqual([
      expect.objectContaining({
        filename: "agile-logo.png",
        contentType: "image/png",
      }),
    ]);
  });

  it("maps a provider failure to a retryable MailProviderError", async () => {
    const providerError = Object.assign(new Error("smtp down"), {
      responseCode: 421,
      response: "Service not available",
    });
    sendMail.mockRejectedValue(providerError);

    await expect(
      adapter.sendEmail({
        to: "student@gmail.com",
        subject: "x",
        html: "<p>x</p>",
        text: "x",
      })
    ).rejects.toThrowError(MailProviderError);

    await expect(
      adapter.sendEmail({
        to: "student@gmail.com",
        subject: "x",
        html: "<p>x</p>",
        text: "x",
      })
    ).rejects.toMatchObject({
      code: "SMTP_SEND_FAILED",
      retryable: true,
      message: expect.stringContaining("421"),
    });
  });

  it("refuses to send when credentials are missing", async () => {
    const unconfigured = new SmtpMailAdapter({
      ...CONFIG,
      user: undefined,
      password: undefined,
    });

    await expect(
      unconfigured.sendEmail({
        to: "student@gmail.com",
        subject: "x",
        html: "<p>x</p>",
        text: "x",
      })
    ).rejects.toMatchObject({
      code: "SMTP_NOT_CONFIGURED",
      retryable: false,
    });
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("createMailAdapter", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults to direct SMTP on port 465 with secure enabled", () => {
    delete process.env.GOOGLE_SMTP_HOST;
    delete process.env.GOOGLE_SMTP_PORT;
    process.env.GOOGLE_SMTP_USER = "owner@gmail.com";
    process.env.GOOGLE_SMTP_PASSWORD = "app-password";

    createTransport.mockClear();

    const adapter = createMailAdapter();
    expect(adapter).toBeInstanceOf(SmtpMailAdapter);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
      })
    );
  });

  it("ignores any legacy MAIL_TRANSPORT value and stays on SMTP", () => {
    process.env.GOOGLE_SMTP_PORT = "465";
    process.env.GOOGLE_SMTP_USER = "owner@gmail.com";
    process.env.GOOGLE_SMTP_PASSWORD = "app-password";
    process.env.MAIL_TRANSPORT = "gmail_api";

    createTransport.mockClear();

    const adapter = createMailAdapter();
    expect(adapter).toBeInstanceOf(SmtpMailAdapter);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true })
    );
  });

  it("uses implicit TLS only for port 465", () => {
    process.env.GOOGLE_SMTP_PORT = "587";
    process.env.GOOGLE_SMTP_USER = "owner@gmail.com";
    process.env.GOOGLE_SMTP_PASSWORD = "app-password";

    createTransport.mockClear();

    createMailAdapter();
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false })
    );
  });
});