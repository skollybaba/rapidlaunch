import "server-only";

export interface WhatsAppSendInput {
  to: string;
  text: string;
}

export interface WhatsAppSendResult {
  providerMessageId: string | null;
  sentAt: Date;
}

export interface WhatsAppAdapter {
  sendText(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
}

export interface WhatsAppAdapterConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
}

export class WhatsAppProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "WhatsAppProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

const NIGERIA_COUNTRY_CODE = "234";
const NIGERIAN_PHONE_LENGTH = 13;
const WHATSAPP_API_VERSION = "v22.0";

export function normalizeWhatsAppNumber(raw: string): string | null {
  const cleaned = raw.replace(/[\s()\-]/g, "").trim();
  if (!cleaned) return null;

  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = normalized.slice(1);
  }
  if (!normalized.startsWith(NIGERIA_COUNTRY_CODE)) {
    normalized = `${NIGERIA_COUNTRY_CODE}${normalized}`;
  }

  if (normalized.length !== NIGERIAN_PHONE_LENGTH) {
    return null;
  }
  return `+${normalized}`;
}

export class WhatsAppCloudApiAdapter implements WhatsAppAdapter {
  private readonly baseUrl: string;

  constructor(private readonly config: WhatsAppAdapterConfig) {
    const version = config.apiVersion ?? WHATSAPP_API_VERSION;
    this.baseUrl = `https://graph.facebook.com/${version}/${config.phoneNumberId}/messages`;
  }

  async sendText(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.to,
          type: "text",
          text: { body: input.text },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        await res.text().catch(() => undefined);
        throw new WhatsAppProviderError(
          "WHATSAPP_SEND_FAILED",
          `WhatsApp API responded with ${res.status}`,
          res.status >= 500 || res.status === 429
        );
      }

      const data = (await res.json().catch(() => null)) as {
        messages?: Array<{ id?: string }>;
      } | null;

      return {
        providerMessageId: data?.messages?.[0]?.id ?? null,
        sentAt: new Date(),
      };
    } catch (error) {
      if (error instanceof WhatsAppProviderError) {
        throw error;
      }
      throw new WhatsAppProviderError(
        "WHATSAPP_SEND_FAILED",
        "Could not send WhatsApp message",
        true
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

class UnconfiguredWhatsAppAdapter implements WhatsAppAdapter {
  async sendText(): Promise<WhatsAppSendResult> {
    throw new WhatsAppProviderError(
      "WHATSAPP_NOT_CONFIGURED",
      "WhatsApp Cloud API credentials are not configured",
      false
    );
  }
}

export function createWhatsAppAdapter(
  config?: WhatsAppAdapterConfig
): WhatsAppAdapter {
  const cfg: WhatsAppAdapterConfig = config ?? {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  };

  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return new UnconfiguredWhatsAppAdapter();
  }
  return new WhatsAppCloudApiAdapter(cfg);
}