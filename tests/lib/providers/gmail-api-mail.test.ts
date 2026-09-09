import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("googleapis", () => {
  return {
    google: {
      gmail: vi.fn(() => sharedGmail),
      auth: {
        OAuth2: vi.fn(function () {
          return { setCredentials: vi.fn() };
        }),
      },
    },
  };
});

import { GmailApiMailAdapter } from "@/lib/providers/mail";

const sharedGmail = {
  users: {
    getProfile: vi.fn(),
    messages: { send: vi.fn() },
  },
};

const CONFIG = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  fromName: "Agile Minds Hub",
  fromEmail: "owner@gmail.com",
};

function decodeRaw(raw: unknown): string {
  return Buffer.from(String(raw), "base64url").toString("utf8");
}

beforeEach(() => {
  vi.clearAllMocks();
  sharedGmail.users.getProfile.mockResolvedValue({
    data: { emailAddress: "owner@gmail.com" },
  });
  sharedGmail.users.messages.send.mockResolvedValue({
    data: { id: "msg-x" },
  });
});

describe("GmailApiMailAdapter", () => {
  const adapter = new GmailApiMailAdapter(CONFIG);

  it("sends a base64url MIME message via the Gmail API", async () => {
    sharedGmail.users.messages.send.mockResolvedValueOnce({
      data: { id: "msg-123", threadId: "th-1" },
    });

    const result = await adapter.sendEmail({
      to: "student@gmail.com",
      subject: "Welcome to the course",
      html: "<p>Hi</p>",
      text: "Hi",
    });

    expect(
      sharedGmail.users.messages.send
    ).toHaveBeenCalledWith({
      userId: "me",
      requestBody: {
        raw: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
      },
    });

    const raw = sharedGmail.users.messages.send.mock.calls[0][0]
      .requestBody.raw as string;
    const decoded = decodeRaw(raw);
    expect(decoded).toContain("From: \"Agile Minds Hub\" <owner@gmail.com>");
    expect(decoded).toContain("To: student@gmail.com");
    expect(decoded).toContain("Subject: Welcome to the course");
    expect(decoded).toContain("Hi");

    expect(result.providerMessageId).toBe("msg-123");
    expect(result.sentAt).toBeInstanceOf(Date);
  });

  it("embeds the logo inline via cid in template and test emails", async () => {
    await adapter.sendTemplateEmail({
      templateKey: "account_welcome",
      to: "student@gmail.com",
      variables: { name: "Ade", appUrl: "https://example.com" },
    });

    const raw = sharedGmail.users.messages.send.mock.calls[0][0].requestBody
      .raw as string;
    const decoded = decodeRaw(raw);
    expect(decoded).toContain('src="cid:agile-logo"');
    expect(decoded).toContain('Content-Type: image/png; name="agile-logo.png"');
    expect(decoded).toContain("Content-ID: <agile-logo>");
    expect(decoded).toContain("Content-Disposition: inline");
    expect(decoded).toContain("multipart/mixed");

    vi.clearAllMocks();
    sharedGmail.users.messages.send.mockResolvedValueOnce({
      data: { id: "msg-test" },
    });
    await adapter.sendTestEmail();
    const testRaw = sharedGmail.users.messages.send.mock.calls[0][0]
      .requestBody.raw as string;
    expect(decodeRaw(testRaw)).toContain("Content-ID: <agile-logo>");
  });

  it("resolves the sender from the account profile when fromEmail is unset", async () => {
    sharedGmail.users.getProfile.mockResolvedValueOnce({
      data: { emailAddress: "profile-owner@gmail.com" },
    });
    sharedGmail.users.messages.send.mockResolvedValueOnce({
      data: { id: "msg-456" },
    });

    const adapterNoFrom = new GmailApiMailAdapter({
      clientId: "c",
      clientSecret: "s",
      refreshToken: "r",
      fromName: "Rapid Launch",
    });
    await adapterNoFrom.sendTestEmail();

    expect(sharedGmail.users.getProfile).toHaveBeenCalledWith({
      userId: "me",
    });
    const to = sharedGmail.users.messages.send.mock.calls[0][0].requestBody
      .raw as string;
    expect(decodeRaw(to)).toContain("To: profile-owner@gmail.com");
  });

  it("maps provider errors to a MailProviderError with the detail", async () => {
    sharedGmail.users.messages.send.mockRejectedValueOnce({
      code: 403,
      response: {
        data: {
          error: {
            message: "Request had insufficient authentication scopes.",
          },
        },
      },
    });

    await expect(
      adapter.sendEmail({
        to: "student@gmail.com",
        subject: "Test",
        html: "<p>t</p>",
        text: "t",
      })
    ).rejects.toMatchObject({
      name: "MailProviderError",
      code: "GMAIL_SEND_FAILED",
      retryable: true,
      message: expect.stringContaining("insufficient authentication scopes"),
    });
  });

  it("throws MAIL_NOT_CONFIGURED when no sender can be resolved", async () => {
    const adapterEmpty = new GmailApiMailAdapter({
      clientId: "c",
      clientSecret: "s",
      refreshToken: "r",
      fromName: "Rapid Launch",
    });
    sharedGmail.users.getProfile.mockResolvedValueOnce({
      data: { emailAddress: "" },
    });

    await expect(adapterEmpty.sendTestEmail()).rejects.toMatchObject({
      name: "MailProviderError",
      code: "MAIL_NOT_CONFIGURED",
    });
  });
});