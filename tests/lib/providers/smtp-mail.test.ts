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
        cid: "agile-logo",
        contentDisposition: "inline",
        content: expect.any(Buffer),
      }),
    ]);
    expect(payload.attachments[0].content.length).toBeGreaterThan(0);
  });

  it("renders the admin sale alert with escaped values and a dashboard link", async () => {
    await adapter.sendTemplateEmail({
      templateKey: "admin_order_alert",
      to: "owner@gmail.com",
      variables: {
        itemTitle: "AI <script>alert(1)</script> Course",
        itemKind: "Course",
        orderReference: "QL-1001",
        amount: "₦50,000.00",
        customerEmail: "buyer&seller@example.com",
        customerName: "",
        paidAt: "Thursday, 8 October 2026 at 17:14",
        paymentReference: "QL-PAY-ABC",
        otherItems: "",
        adminOrdersUrl: "https://example.com/admin/orders",
      },
    });

    const payload = sendMail.mock.calls[0][0];
    expect(payload.subject).toBe("New Course sale: AI <script>alert(1)</script> Course");
    expect(payload.html).not.toContain("<script>alert(1)</script>");
    expect(payload.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(payload.html).toContain("buyer&amp;seller@example.com");
    expect(payload.html).toContain("QL-1001");
    expect(payload.html).toContain("https://example.com/admin/orders");
    expect(payload.text).toContain("Order reference: QL-1001");
    expect(payload.text).toContain("Customer: buyer&seller@example.com");
  });

  it("renders sequence steps in the shared broadcast shell", async () => {
    await adapter.sendTemplateEmail({
      templateKey: "sequence_step",
      to: "student@gmail.com",
      variables: {
        subject: "Your first lesson is ready",
        title: "Welcome to the course",
        body: '<p>Start here.</p><img src="https://example.com/lesson.png" width="900" />',
      },
    });

    const payload = sendMail.mock.calls[0][0];
    expect(payload.subject).toBe("Your first lesson is ready");

    // Same shell as broadcasts: 600px card with a logo-only dark header.
    expect(payload.html).toContain('class="email-shell"');
    expect(payload.html).toContain("max-width:600px");

    // The headline sits in the white content card, never inside the header.
    expect(payload.html).toMatch(/<h1[^>]*>Welcome to the course<\/h1>/);
    const headerStart = payload.html.indexOf("background:#141414");
    const headlineStart = payload.html.indexOf("<h1");
    expect(headerStart).toBeGreaterThan(-1);
    expect(headlineStart).toBeGreaterThan(headerStart);
    expect(payload.html.slice(headerStart, headlineStart)).not.toContain(
      "Welcome to the course"
    );

    // Wide images are capped to the container instead of overflowing.
    expect(payload.html).toContain(".email-body img");
    expect(payload.html).toContain("max-width:100%; height:auto;");
    expect(payload.html).toContain("Manrope");
    expect(payload.text).toContain("Start here.");
  });

  it("falls back to the hosted logo URL when the logo file cannot be read", async () => {
    vi.resetModules();
    vi.doMock("node:fs", () => ({
      readFileSync: () => {
        throw new Error("ENOENT");
      },
    }));
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const fresh = await import("@/lib/providers/mail");
      const freshAdapter = new fresh.SmtpMailAdapter(CONFIG);
      await freshAdapter.sendTemplateEmail({
        templateKey: "account_welcome",
        to: "student@gmail.com",
        variables: { name: "Ade", appUrl: "https://example.com" },
      });

      const payload = sendMail.mock.calls[0][0];
      expect(payload.html).toContain(
        'src="https://example.com/images/agile_logo.png"'
      );
      expect(payload.html).not.toContain("cid:agile-logo");
      expect(payload.attachments).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Brand logo file not found")
      );
    } finally {
      warnSpy.mockRestore();
      vi.doUnmock("node:fs");
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
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