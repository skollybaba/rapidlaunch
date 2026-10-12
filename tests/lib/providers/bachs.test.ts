import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

import axios from "axios";
import {
  BachsProviderError,
  createBachsAdapter,
  HttpBachsAdapter,
  verifyBachsWebhookSignature,
} from "@/lib/providers/bachs";

const mockPost = vi.mocked(axios.post);
const mockGet = vi.mocked(axios.get);

const SECRET = "sk_test_bachs_dummy";
const API_BASE = "https://sandbox-api.bachs.io";
const WEBHOOK_SECRET = "whsec_test";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HttpBachsAdapter.initializeTransaction", () => {
  it("creates a checkout session with decimal pricing and returns a safe result", async () => {
    mockPost.mockResolvedValue({
      data: {
        checkout_id: "chk_123",
        checkout_url: "https://checkout.bachs.io/chk_123",
        status: "open",
      },
    });

    const adapter = new HttpBachsAdapter(SECRET, API_BASE);
    const result = await adapter.initializeTransaction({
      amountMinor: 5_000_000,
      currency: "NGN",
      email: "buyer@example.com",
      reference: "QL-PAY-ABC",
      callbackUrl: "http://localhost:3000/payment/callback?reference=QL-PAY-ABC",
    });

    expect(mockPost).toHaveBeenCalledWith(
      `${API_BASE}/v1/checkout-sessions`,
      expect.objectContaining({
        customer: { email: "buyer@example.com" },
        pricing: { currency: "NGN", amount: "50000.00", price_type: "fixed" },
        success_url:
          "http://localhost:3000/payment/callback?reference=QL-PAY-ABC",
        reference: "QL-PAY-ABC",
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${SECRET}`,
          "Idempotency-Key": "QL-PAY-ABC",
        }),
      })
    );

    expect(result).toEqual({
      authorizationUrl: "https://checkout.bachs.io/chk_123",
      accessCode: "",
      reference: "QL-PAY-ABC",
      providerCheckoutId: "chk_123",
    });
  });

  it("wraps network failures as retryable provider errors", async () => {
    mockPost.mockRejectedValue(new Error("socket hang up"));

    const adapter = new HttpBachsAdapter(SECRET, API_BASE);
    await expect(
      adapter.initializeTransaction({
        amountMinor: 100,
        currency: "NGN",
        email: "a@b.com",
        reference: "R1",
        callbackUrl: "http://localhost:3000/payment/callback",
      })
    ).rejects.toMatchObject({
      name: "BachsProviderError",
      retryable: true,
      code: "PROVIDER_UNAVAILABLE",
    });
  });

  it("raises a non-retryable error on a malformed response", async () => {
    mockPost.mockResolvedValue({ data: {} });

    const adapter = new HttpBachsAdapter(SECRET, API_BASE);
    await expect(
      adapter.initializeTransaction({
        amountMinor: 100,
        currency: "NGN",
        email: "a@b.com",
        reference: "R1",
        callbackUrl: "http://localhost:3000/payment/callback",
      })
    ).rejects.toMatchObject({
      code: "PROVIDER_MALFORMED_RESPONSE",
      retryable: false,
    });
  });
});

describe("HttpBachsAdapter.verifyTransaction", () => {
  it("marks a settled charge as paid and converts the decimal amount", async () => {
    mockGet.mockResolvedValue({
      data: {
        checkout_id: "chk_123",
        status: "completed",
        amount: "50000.00",
        currency: "NGN",
        charge: { id: "ch_1", status: "succeeded", amount: "50000.00", currency: "NGN" },
      },
    });

    const adapter = new HttpBachsAdapter(SECRET, API_BASE);
    const result = await adapter.verifyTransaction("chk_123");

    expect(mockGet).toHaveBeenCalledWith(
      `${API_BASE}/v1/checkout-sessions/chk_123`,
      expect.objectContaining({
        headers: { Authorization: `Bearer ${SECRET}` },
      })
    );
    expect(result).toMatchObject({
      paid: true,
      status: "success",
      amountMinor: 5_000_000,
      currency: "NGN",
    });
  });

  it("treats an accepted/overpaid charge as paid", async () => {
    mockGet.mockResolvedValue({
      data: {
        checkout_id: "chk_2",
        status: "completed",
        charge: { status: "overpaid", amount: "100.00", currency: "USD" },
      },
    });

    const adapter = new HttpBachsAdapter(SECRET, API_BASE);
    const result = await adapter.verifyTransaction("chk_2");
    expect(result.paid).toBe(true);
    expect(result.amountMinor).toBe(10_000);
  });

  it("reports an open session as not paid", async () => {
    mockGet.mockResolvedValue({
      data: { checkout_id: "chk_3", status: "open", charge: null },
    });

    const adapter = new HttpBachsAdapter(SECRET, API_BASE);
    const result = await adapter.verifyTransaction("chk_3");
    expect(result.paid).toBe(false);
    expect(result.status).toBe("unknown");
  });

  it("maps an expired session to abandoned", async () => {
    mockGet.mockResolvedValue({
      data: { checkout_id: "chk_4", status: "expired", charge: null },
    });

    const adapter = new HttpBachsAdapter(SECRET, API_BASE);
    const result = await adapter.verifyTransaction("chk_4");
    expect(result.status).toBe("abandoned");
  });

  it("raises a non-retryable error when the payload is malformed", async () => {
    mockGet.mockResolvedValue({ data: {} });
    const adapter = new HttpBachsAdapter(SECRET, API_BASE);
    await expect(adapter.verifyTransaction("chk_4")).rejects.toMatchObject({
      code: "PROVIDER_MALFORMED_RESPONSE",
      retryable: false,
    });
  });

  it("wraps network failures as retryable", async () => {
    mockGet.mockRejectedValue(new Error("timeout"));
    const adapter = new HttpBachsAdapter(SECRET, API_BASE);
    await expect(adapter.verifyTransaction("chk_4")).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
    });
  });
});

describe("verifyBachsWebhookSignature", () => {
  const rawBody = JSON.stringify({
    event: "collection.succeeded",
    data: { reference: "QL-PAY-ABC" },
  });

  it("accepts a standalone signature header", () => {
    const timestamp = "1700000000";
    const signature = createHmac("sha256", WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`, "utf8")
      .digest("hex");

    expect(
      verifyBachsWebhookSignature(rawBody, signature, timestamp, WEBHOOK_SECRET)
    ).toBe(true);
  });

  it("accepts a combined v2 signature header", () => {
    const timestamp = "1700000000";
    const signature = createHmac("sha256", WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`, "utf8")
      .digest("hex");
    const header = `t=${timestamp},v1=${signature}`;

    expect(
      verifyBachsWebhookSignature(rawBody, header, "", WEBHOOK_SECRET)
    ).toBe(true);
  });

  it("rejects a tampered body", () => {
    const timestamp = "1700000000";
    const signature = createHmac("sha256", WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`, "utf8")
      .digest("hex");

    expect(
      verifyBachsWebhookSignature("{}", signature, timestamp, WEBHOOK_SECRET)
    ).toBe(false);
  });

  it("rejects a wrong secret and empty input", () => {
    const timestamp = "1700000000";
    const signature = createHmac("sha256", "other")
      .update(`${timestamp}.${rawBody}`, "utf8")
      .digest("hex");

    expect(
      verifyBachsWebhookSignature(rawBody, signature, timestamp, WEBHOOK_SECRET)
    ).toBe(false);
    expect(verifyBachsWebhookSignature("", "", "", WEBHOOK_SECRET)).toBe(false);
  });
});

it("createBachsAdapter returns an adapter tagged with the bachs provider", () => {
  const adapter = createBachsAdapter(SECRET, API_BASE);
  expect(adapter.provider).toBe("bachs");
});

it("BachsProviderError preserves code and retryability", () => {
  const error = new BachsProviderError("PROVIDER_UNAVAILABLE", "offline", true);
  expect(error.code).toBe("PROVIDER_UNAVAILABLE");
  expect(error.retryable).toBe(true);
  expect(error).toBeInstanceOf(Error);
});
