import "server-only";

import axios from "axios";
import { createHmac, timingSafeEqual } from "node:crypto";

import { decimalStringToMinor, minorToDecimalString } from "@/lib/money";
import type {
  InitializeTransactionInput,
  InitializeTransactionResult,
  PaymentAdapter,
  VerifyTransactionResult,
} from "@/types/payment";

export const BACHS_API_BASE = "https://api.bachs.io";

export class BachsProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "BachsProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

interface BachsCharge {
  id?: string;
  status?: string;
  amount?: string | number;
  currency?: string;
  reference?: string;
}

interface BachsCheckoutSession {
  checkout_id?: string;
  checkout_url?: string;
  status?: string;
  reference?: string;
  amount?: string | number;
  currency?: string;
  charge?: BachsCharge | null;
}

function mapBachsStatus(
  sessionStatus: string,
  chargeStatus: string
): VerifyTransactionResult["status"] {
  if (chargeStatus === "failed") return "failed";
  if (sessionStatus === "expired" || sessionStatus === "cancelled") {
    return "abandoned";
  }
  return "unknown";
}

const PAID_CHARGE_STATUSES = new Set(["succeeded", "accepted", "overpaid"]);

export class HttpBachsAdapter implements PaymentAdapter {
  readonly provider = "bachs" as const;

  constructor(
    private readonly secretKey: string,
    private readonly apiBase: string = process.env.BACHS_API_BASE_URL?.trim() ||
      BACHS_API_BASE
  ) {}

  async initializeTransaction(
    input: InitializeTransactionInput
  ): Promise<InitializeTransactionResult> {
    try {
      const response = await axios.post(
        `${this.apiBase}/v1/checkout-sessions`,
        {
          customer: { email: input.email },
          pricing: {
            currency: input.currency,
            amount: minorToDecimalString(input.amountMinor, input.currency),
            price_type: "fixed",
          },
          success_url: input.callbackUrl,
          reference: input.reference,
          metadata: input.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            // Bachs supports idempotent checkout creation keyed on our internal
            // reference, so a retried init cannot create two sessions.
            "Idempotency-Key": input.reference,
          },
          timeout: 15_000,
        }
      );

      const data: BachsCheckoutSession = response.data?.data ?? response.data;
      if (!data?.checkout_url || !data?.checkout_id) {
        throw new BachsProviderError(
          "PROVIDER_MALFORMED_RESPONSE",
          "Bachs returned an unexpected checkout response",
          false
        );
      }

      return {
        authorizationUrl: data.checkout_url,
        accessCode: "",
        reference: input.reference,
        providerCheckoutId: data.checkout_id,
      };
    } catch (error) {
      if (error instanceof BachsProviderError) throw error;
      throw new BachsProviderError(
        "PROVIDER_UNAVAILABLE",
        "Could not initialize the payment with Bachs",
        true
      );
    }
  }

  async verifyTransaction(
    reference: string
  ): Promise<VerifyTransactionResult> {
    try {
      const response = await axios.get(
        `${this.apiBase}/v1/checkout-sessions/${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${this.secretKey}` },
          timeout: 15_000,
        }
      );

      const data: BachsCheckoutSession = response.data?.data ?? response.data;
      if (!data?.checkout_id) {
        throw new BachsProviderError(
          "PROVIDER_MALFORMED_RESPONSE",
          "Bachs returned an unexpected verification response",
          false
        );
      }

      const sessionStatus = data.status ?? "";
      const charge = data.charge ?? null;
      const chargeStatus = charge?.status ?? "";
      const paid = PAID_CHARGE_STATUSES.has(chargeStatus);

      const amountSource = charge?.amount ?? data.amount;
      const currency = charge?.currency ?? data.currency ?? "";

      return {
        status: paid
          ? "success"
          : mapBachsStatus(sessionStatus, chargeStatus),
        paid,
        amountMinor:
          amountSource === undefined || amountSource === null
            ? 0
            : decimalStringToMinor(String(amountSource), currency),
        currency,
        reference,
        raw: response.data,
      };
    } catch (error) {
      if (error instanceof BachsProviderError) throw error;
      throw new BachsProviderError(
        "PROVIDER_UNAVAILABLE",
        "Could not verify the transaction with Bachs",
        true
      );
    }
  }
}

export function createBachsAdapter(
  secretKey: string,
  apiBase?: string
): HttpBachsAdapter {
  return new HttpBachsAdapter(secretKey, apiBase);
}

/**
 * Verify a Bachs webhook signature.
 *
 * Bachs signs `"{timestamp}.{rawBody}"` with HMAC-SHA256 using the webhook
 * signing secret. The timestamp arrives in `X-Bachs-Timestamp` (unix seconds)
 * and the signature in `X-Bachs-Signature`, or as a combined
 * `X-Bachs-Signature-V2` header of the form `t=...,v1=...`. Accepting both lets
 * us validate whichever the account is configured to send.
 */
export function verifyBachsWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  timestampHeader: string | null | undefined,
  secret: string
): boolean {
  if (!rawBody || !signatureHeader || !secret) return false;

  let timestamp = timestampHeader ? Number(timestampHeader) : Number.NaN;
  const candidates: string[] = [];

  if (signatureHeader.includes("=")) {
    for (const part of signatureHeader.split(",")) {
      const [key, value] = part.split("=").map((piece) => piece.trim());
      if (key === "t") timestamp = Number(value);
      else if (key === "v1" && value) candidates.push(value);
    }
  } else {
    candidates.push(signatureHeader.trim());
  }

  if (!Number.isFinite(timestamp) || candidates.length === 0) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return candidates.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, "hex");
    if (candidateBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, candidateBuffer);
  });
}
