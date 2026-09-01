import "server-only";

import axios from "axios";
import { createHmac, timingSafeEqual } from "node:crypto";

export type PaystackTransactionStatus =
  | "success"
  | "failed"
  | "abandoned"
  | "unknown";

export interface InitializeTransactionInput {
  amountMinor: number;
  currency: string;
  email: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyTransactionResult {
  status: PaystackTransactionStatus;
  paid: boolean;
  amountMinor: number;
  currency: string;
  reference: string;
  raw: unknown;
}

export interface PaystackAdapter {
  initializeTransaction(
    input: InitializeTransactionInput
  ): Promise<InitializeTransactionResult>;

  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;

  validateWebhookSignature(rawBody: string, signature: string): boolean;

  mapProviderStatus(status: string): PaystackTransactionStatus;
}

export class PaystackProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "PaystackProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

const PAYSTACK_API_BASE = "https://api.paystack.co";

export class HttpPaystackAdapter implements PaystackAdapter {
  constructor(
    private readonly secretKey: string,
    private readonly apiBase: string = PAYSTACK_API_BASE
  ) {}

  async initializeTransaction(
    input: InitializeTransactionInput
  ): Promise<InitializeTransactionResult> {
    try {
      const response = await axios.post(
        `${this.apiBase}/transaction/initialize`,
        {
          amount: input.amountMinor,
          currency: input.currency,
          email: input.email,
          reference: input.reference,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
          timeout: 15_000,
        }
      );

      const data = response.data?.data;
      if (!data?.authorization_url || !data?.reference) {
        throw new PaystackProviderError(
          "PROVIDER_MALFORMED_RESPONSE",
          "Paystack returned an unexpected initialization response",
          false
        );
      }

      return {
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code ?? "",
        reference: data.reference,
      };
    } catch (error) {
      if (error instanceof PaystackProviderError) throw error;
      throw new PaystackProviderError(
        "PROVIDER_UNAVAILABLE",
        "Could not initialize the payment with Paystack",
        true
      );
    }
  }

  async verifyTransaction(
    reference: string
  ): Promise<VerifyTransactionResult> {
    try {
      const response = await axios.get(
        `${this.apiBase}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${this.secretKey}` },
          timeout: 15_000,
        }
      );

      const data = response.data?.data;
      if (!data?.reference) {
        throw new PaystackProviderError(
          "PROVIDER_MALFORMED_RESPONSE",
          "Paystack returned an unexpected verification response",
          false
        );
      }

      const status = this.mapProviderStatus(data.status);

      return {
        status,
        paid: status === "success",
        amountMinor: data.amount ?? 0,
        currency: data.currency ?? "",
        reference: data.reference,
        raw: response.data,
      };
    } catch (error) {
      if (error instanceof PaystackProviderError) throw error;
      throw new PaystackProviderError(
        "PROVIDER_UNAVAILABLE",
        "Could not verify the transaction with Paystack",
        true
      );
    }
  }

  validateWebhookSignature(rawBody: string, signature: string): boolean {
    if (!rawBody || !signature) return false;

    const expected = createHmac("sha512", this.secretKey)
      .update(rawBody, "utf8")
      .digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");

    if (expectedBuffer.length !== signatureBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  mapProviderStatus(status: string): PaystackTransactionStatus {
    switch (status) {
      case "success":
        return "success";
      case "abandoned":
        return "abandoned";
      case "failed":
        return "failed";
      default:
        return "unknown";
    }
  }
}

export function createPaystackAdapter(
  secretKey: string
): PaystackAdapter {
  return new HttpPaystackAdapter(secretKey);
}