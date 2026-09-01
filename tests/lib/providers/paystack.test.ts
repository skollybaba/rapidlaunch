import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

import axios from "axios";
import {
  createPaystackAdapter,
  HttpPaystackAdapter,
  PaystackProviderError,
} from "@/lib/providers/paystack";

const mockPost = vi.mocked(axios.post);
const mockGet = vi.mocked(axios.get);

const SECRET = "sk_test_unit_dummy";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateWebhookSignature", () => {
  it("accepts a valid HMAC SHA512 signature", () => {
    const adapter = createPaystackAdapter(SECRET);
    const rawBody = JSON.stringify({ event: "charge.success" });
    const signature = createHmac("sha512", SECRET)
      .update(rawBody, "utf8")
      .digest("hex");

    expect(adapter.validateWebhookSignature(rawBody, signature)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const adapter = createPaystackAdapter(SECRET);
    const rawBody = JSON.stringify({ event: "charge.success" });
    const signature = createHmac("sha512", "sk_test_wrong")
      .update(rawBody, "utf8")
      .digest("hex");

    expect(adapter.validateWebhookSignature(rawBody, signature)).toBe(false);
  });

  it("rejects empty input", () => {
    const adapter = createPaystackAdapter(SECRET);
    expect(adapter.validateWebhookSignature("", "")).toBe(false);
  });
});

describe("mapProviderStatus", () => {
  const adapter = createPaystackAdapter(SECRET);

  it("maps known statuses", () => {
    expect(adapter.mapProviderStatus("success")).toBe("success");
    expect(adapter.mapProviderStatus("failed")).toBe("failed");
    expect(adapter.mapProviderStatus("abandoned")).toBe("abandoned");
  });

  it("maps unknown statuses to unknown", () => {
    expect(adapter.mapProviderStatus("processing")).toBe("unknown");
  });
});

describe("HttpPaystackAdapter.initializeTransaction", () => {
  it("calls the Paystack initialize endpoint with minor units and returns safe data", async () => {
    mockPost.mockResolvedValue({
      data: {
        data: {
          authorization_url: "https://checkout.paystack.com/abc",
          access_code: "ac_xyz",
          reference: "QL-PAY-ABC",
        },
      },
    });

    const adapter = new HttpPaystackAdapter(SECRET);
    const result = await adapter.initializeTransaction({
      amountMinor: 5_000_000,
      currency: "NGN",
      email: "buyer@example.com",
      reference: "QL-PAY-ABC",
      callbackUrl: "http://localhost:3000/payment/callback?reference=QL-PAY-ABC",
    });

    expect(mockPost).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/initialize",
      expect.objectContaining({
        amount: 5_000_000,
        currency: "NGN",
        reference: "QL-PAY-ABC",
      }),
      expect.objectContaining({
        headers: { Authorization: `Bearer ${SECRET}` },
      })
    );

    expect(result).toEqual({
      authorizationUrl: "https://checkout.paystack.com/abc",
      accessCode: "ac_xyz",
      reference: "QL-PAY-ABC",
    });
  });

  it("wraps network failures as retryable provider errors", async () => {
    mockPost.mockRejectedValue(new Error("socket hang up"));

    const adapter = new HttpPaystackAdapter(SECRET);
    await expect(
      adapter.initializeTransaction({
        amountMinor: 100,
        currency: "NGN",
        email: "a@b.com",
        reference: "R1",
        callbackUrl: "http://localhost:3000/payment/callback",
      })
    ).rejects.toMatchObject({
      name: "PaystackProviderError",
      retryable: true,
      code: "PROVIDER_UNAVAILABLE",
    });
  });
});

describe("HttpPaystackAdapter.verifyTransaction", () => {
  it("marks a successful payment as paid", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          reference: "QL-PAY-ABC",
          status: "success",
          amount: 5_000_000,
          currency: "NGN",
        },
      },
    });

    const adapter = new HttpPaystackAdapter(SECRET);
    const result = await adapter.verifyTransaction("QL-PAY-ABC");

    expect(mockGet).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/verify/QL-PAY-ABC",
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

  it("marks non-successful statuses as not paid", async () => {
    mockGet.mockResolvedValue({
      data: { data: { reference: "R2", status: "abandoned", amount: 0, currency: "NGN" } },
    });

    const adapter = new HttpPaystackAdapter(SECRET);
    const result = await adapter.verifyTransaction("R2");

    expect(result.paid).toBe(false);
    expect(result.status).toBe("abandoned");
  });

  it("raises a non-retryable error when the payload is malformed", async () => {
    mockGet.mockResolvedValue({ data: {} });

    const adapter = new HttpPaystackAdapter(SECRET);
    await expect(adapter.verifyTransaction("R3")).rejects.toMatchObject({
      code: "PROVIDER_MALFORMED_RESPONSE",
      retryable: false,
    });
  });

  it("wraps network failures as retryable provider errors", async () => {
    mockGet.mockRejectedValue(new Error("timeout"));
    const adapter = new HttpPaystackAdapter(SECRET);
    await expect(adapter.verifyTransaction("R4")).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
    });
  });
});

it("PaystackProviderError preserves code and retryability", () => {
  const error = new PaystackProviderError("PROVIDER_UNAVAILABLE", "offline", true);
  expect(error.code).toBe("PROVIDER_UNAVAILABLE");
  expect(error.retryable).toBe(true);
  expect(error).toBeInstanceOf(Error);
});