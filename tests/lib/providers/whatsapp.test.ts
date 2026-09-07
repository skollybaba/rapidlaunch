import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createWhatsAppAdapter,
  normalizeWhatsAppNumber,
  WhatsAppCloudApiAdapter,
  WhatsAppProviderError,
} from "@/lib/providers/whatsapp";

describe("normalizeWhatsAppNumber", () => {
  it("normalizes a Nigerian number starting with 0", () => {
    expect(normalizeWhatsAppNumber("08160504976")).toBe("+2348160504976");
  });

  it("keeps an already international Nigerian number", () => {
    expect(normalizeWhatsAppNumber("+2348160504976")).toBe("+2348160504976");
  });

  it("accepts a country-code-only Nigerian number", () => {
    expect(normalizeWhatsAppNumber("2348160504976")).toBe("+2348160504976");
  });

  it("adds the country code to a bare subscriber number", () => {
    expect(normalizeWhatsAppNumber("8160504976")).toBe("+2348160504976");
  });

  it("strips spaces, parentheses and dashes", () => {
    expect(normalizeWhatsAppNumber("0812 345 6789")).toBe("+2348123456789");
    expect(normalizeWhatsAppNumber("+234 (812) 345-6789")).toBe(
      "+2348123456789"
    );
  });

  it("rejects numbers that are not a full Nigerian phone number", () => {
    expect(normalizeWhatsAppNumber("1234")).toBeNull();
    expect(normalizeWhatsAppNumber("+447700900123")).toBeNull();
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("   ")).toBeNull();
  });
});

describe("WhatsAppCloudApiAdapter", () => {
  const adapter = new WhatsAppCloudApiAdapter({
    phoneNumberId: "PHONE_ID_1",
    accessToken: "token-123",
  });

  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockFetchResponse(init: {
    status: number;
    body?: unknown;
    abort?: boolean;
  }) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        if (init.abort) {
          const error = new Error("aborted");
          error.name = "AbortError";
          throw error;
        }
        return {
          ok: init.status >= 200 && init.status < 300,
          status: init.status,
          text: async () => JSON.stringify(init.body ?? {}),
          json: async () => init.body ?? {},
        };
      })
    );
  }

  it("posts a text message to the WhatsApp Cloud API", async () => {
    mockFetchResponse({ status: 200, body: { messages: [{ id: "wamid-1" }] } });

    const result = await adapter.sendText({
      to: "+2348160504976",
      text: "Hello from Rapid Launch",
    });

    expect(result.providerMessageId).toBe("wamid-1");
    expect(result.sentAt).toBeInstanceOf(Date);

    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe(
      "https://graph.facebook.com/v22.0/PHONE_ID_1/messages"
    );
    expect(init.headers["Authorization"]).toBe("Bearer token-123");
    expect(init.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(String(init.body));
    expect(body.messaging_product).toBe("whatsapp");
    expect(body.to).toBe("+2348160504976");
    expect(body.type).toBe("text");
    expect(body.text.body).toBe("Hello from Rapid Launch");
  });

  it("throws a non-retryable error on a provider rejection", async () => {
    mockFetchResponse({ status: 401 });

    await expect(
      adapter.sendText({ to: "+2348160504976", text: "hi" })
    ).rejects.toMatchObject({
      name: "WhatsAppProviderError",
      code: "WHATSAPP_SEND_FAILED",
      retryable: false,
    });
  });

  it("throws a retryable error on a 5xx response", async () => {
    mockFetchResponse({ status: 500 });

    await expect(
      adapter.sendText({ to: "+2348160504976", text: "hi" })
    ).rejects.toMatchObject({
      name: "WhatsAppProviderError",
      code: "WHATSAPP_SEND_FAILED",
      retryable: true,
    });
  });

  it("throws a retryable error on a network failure", async () => {
    mockFetchResponse({ status: 200, abort: true });

    await expect(
      adapter.sendText({ to: "+2348160504976", text: "hi" })
    ).rejects.toBeInstanceOf(WhatsAppProviderError);
  });
});

describe("createWhatsAppAdapter", () => {
  it("returns an unconfigured adapter when credentials are missing", async () => {
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");

    const adapter = createWhatsAppAdapter();
    await expect(
      adapter.sendText({ to: "+2348160504976", text: "hi" })
    ).rejects.toMatchObject({
      name: "WhatsAppProviderError",
      code: "WHATSAPP_NOT_CONFIGURED",
      retryable: false,
    });

    vi.unstubAllEnvs();
  });

  it("returns a Cloud API adapter when config is provided", () => {
    const adapter = createWhatsAppAdapter({
      phoneNumberId: "PHONE_ID_1",
      accessToken: "token-123",
    });
    expect(adapter).toBeInstanceOf(WhatsAppCloudApiAdapter);
  });
});