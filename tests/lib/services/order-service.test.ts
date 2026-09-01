import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Order", () => ({
  Order: { findOne: vi.fn(), findById: vi.fn(), create: vi.fn(), updateOne: vi.fn() },
}));

vi.mock("@/models/Payment", () => ({
  Payment: { findOne: vi.fn(), create: vi.fn(), updateOne: vi.fn() },
}));

vi.mock("@/models/PaymentEvent", () => ({
  PaymentEvent: { findOne: vi.fn(), create: vi.fn(), updateOne: vi.fn() },
}));

vi.mock("@/models/Fulfillment", () => ({
  Fulfillment: { findOneAndUpdate: vi.fn() },
}));

vi.mock("@/models/Product", () => ({
  Product: { findOne: vi.fn() },
}));

vi.mock("axios", () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

import axios from "axios";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { PaymentEvent } from "@/models/PaymentEvent";
import { Product } from "@/models/Product";
import {
  createCheckoutSession,
  initializeCheckoutPayment,
  OrderServiceError,
  processPaystackWebhook,
  verifyCheckoutPayment,
} from "@/lib/services/order-service";

const mockPost = vi.mocked(axios.post);
const mockGet = vi.mocked(axios.get);

const SECRET = "sk_test_unit_dummy";

const productDoc = {
  _id: "PROD1",
  type: "COURSE",
  slug: "ai-course",
  title: "AI Course",
  priceMinor: 5_000_000,
  currency: "NGN",
  fulfillmentMode: "CLASSROOM",
  status: "PUBLISHED",
};

const orderDoc = {
  _id: "ORD1",
  orderReference: "QL-XYZ123",
  customerEmail: "buyer@example.com",
  status: "PENDING",
  items: [
    {
      productId: "PROD1",
      titleSnapshot: "AI Course",
      typeSnapshot: "COURSE",
      unitPriceMinor: 5_000_000,
      quantity: 1,
    },
  ],
  subtotalMinor: 5_000_000,
  discountMinor: 0,
  totalMinor: 5_000_000,
  currency: "NGN",
  metadata: { productType: "COURSE", productFulfillmentMode: "CLASSROOM" },
  paidAt: null,
  createdAt: new Date(),
};

const paymentDoc = {
  _id: "PAY1",
  orderId: "ORD1",
  provider: "paystack",
  providerReference: "QL-PAY-ABC",
  status: "CREATED",
  amountMinor: 5_000_000,
  currency: "NGN",
};

function lean(value: unknown) {
  return {
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

function fulfillExec() {
  return { exec: vi.fn().mockResolvedValue({ upserted: "1" }) } as never;
}

function sign(body: string) {
  return createHmac("sha512", SECRET).update(body, "utf8").digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCheckoutSession", () => {
  it("snapshots the server-side price and creates a pending order", async () => {
    vi.mocked(Product.findOne).mockReturnValue(lean(productDoc));
    vi.mocked(Order.create).mockResolvedValue(orderDoc as never);

    const result = await createCheckoutSession({
      productId: "PROD1",
      customerEmail: " Buyer@Example.com ",
    });

    expect(Order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderReference: expect.stringMatching(/^QL-/),
        customerEmail: "buyer@example.com",
        subtotalMinor: 5_000_000,
        discountMinor: 0,
        totalMinor: 5_000_000,
        currency: "NGN",
        items: [
          {
            productId: "PROD1",
            titleSnapshot: "AI Course",
            typeSnapshot: "COURSE",
            unitPriceMinor: 5_000_000,
            quantity: 1,
          },
        ],
        metadata: expect.objectContaining({
          productType: "COURSE",
          productFulfillmentMode: "CLASSROOM",
        }),
      })
    );
    expect(result.itemTitle).toBe("AI Course");
    expect(result.orderReference).toBe("QL-XYZ123");
  });

  it("normalizes the customer email to lowercase", async () => {
    vi.mocked(Product.findOne).mockReturnValue(lean(productDoc));
    vi.mocked(Order.create).mockResolvedValue(orderDoc as never);
    await createCheckoutSession({ productId: "PROD1", customerEmail: "UPPER@Case.COM" });
    expect(vi.mocked(Order.create).mock.calls[0][0]).toMatchObject({
      customerEmail: "upper@case.com",
    });
  });

  it("rejects an unpublished or missing product", async () => {
    vi.mocked(Product.findOne).mockReturnValue(lean(null));
    await expect(
      createCheckoutSession({ productId: "MISSING", customerEmail: "a@b.com" })
    ).rejects.toMatchObject({
      name: "OrderServiceError",
      code: "PRODUCT_NOT_AVAILABLE",
      status: 404,
    });
  });

  it("rejects external-store products at checkout", async () => {
    vi.mocked(Product.findOne).mockReturnValue(
      lean({ ...productDoc, fulfillmentMode: "EXTERNAL" })
    );
    await expect(
      createCheckoutSession({ productId: "PROD1", customerEmail: "a@b.com" })
    ).rejects.toMatchObject({ code: "EXTERNAL_PRODUCT" });
  });

  it("rejects zero-price products", async () => {
    vi.mocked(Product.findOne).mockReturnValue(
      lean({ ...productDoc, priceMinor: 0 })
    );
    await expect(
      createCheckoutSession({ productId: "PROD1", customerEmail: "a@b.com" })
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_PAYABLE" });
  });

  it("rejects an invalid email as a validation error", async () => {
    vi.mocked(Product.findOne).mockReturnValue(lean(productDoc));
    await expect(
      createCheckoutSession({ productId: "PROD1", customerEmail: "not-an-email" })
    ).rejects.toBeInstanceOf(Error);
  });
});

describe("initializeCheckoutPayment", () => {
  it("creates a payment and initializes Paystack with the order snapshot", async () => {
    vi.mocked(Order.findOne).mockReturnValue(lean(orderDoc));
    vi.mocked(Payment.create).mockResolvedValue(paymentDoc as never);
    mockPost.mockResolvedValue({
      data: {
        data: {
          authorization_url: "https://checkout.paystack.com/abc",
          access_code: "ac_1",
          reference: "QL-PAY-ABC",
        },
      },
    });

    const result = await initializeCheckoutPayment({
      orderReference: "QL-XYZ123",
    });

    expect(Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "ORD1",
        provider: "paystack",
        status: "PENDING",
        amountMinor: orderDoc.totalMinor,
        currency: "NGN",
        providerReference: expect.stringMatching(/^QL-PAY-/),
      })
    );
    expect(mockPost).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/initialize",
      expect.objectContaining({
        amount: 5_000_000,
        currency: "NGN",
        email: "buyer@example.com",
        reference: expect.stringMatching(/^QL-PAY-/),
        callback_url: expect.stringContaining("/payment/callback?reference="),
      }),
      expect.anything()
    );
    expect(vi.mocked(Payment.updateOne)).toHaveBeenCalledWith(
      { _id: "PAY1" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "CREATED" }),
      })
    );
    expect(result.authorizationUrl).toBe("https://checkout.paystack.com/abc");
  });

  it("rejects an unknown order", async () => {
    vi.mocked(Order.findOne).mockReturnValue(lean(null));
    await expect(
      initializeCheckoutPayment({ orderReference: "NOPE" })
    ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND", status: 404 });
  });

  it("rejects an order that is no longer pending", async () => {
    vi.mocked(Order.findOne).mockReturnValue(
      lean({ ...orderDoc, status: "PAID" })
    );
    await expect(
      initializeCheckoutPayment({ orderReference: "QL-XYZ123" })
    ).rejects.toMatchObject({ code: "ORDER_NOT_PAYABLE", status: 409 });
  });

  it("marks payment initialization failed with a retryable error on provider failure", async () => {
    vi.mocked(Order.findOne).mockReturnValue(lean(orderDoc));
    vi.mocked(Payment.create).mockResolvedValue(paymentDoc as never);
    mockPost.mockRejectedValue(new Error("timeout"));

    await expect(
      initializeCheckoutPayment({ orderReference: "QL-XYZ123" })
    ).rejects.toMatchObject({ code: "PAYMENT_INIT_RETRYABLE" });
    expect(vi.mocked(Payment.updateOne)).toHaveBeenCalledWith(
      { _id: "PAY1" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "INITIALIZATION_FAILED" }),
      })
    );
  });
});

describe("verifyCheckoutPayment", () => {
  beforeEach(() => {
    vi.mocked(Payment.findOne).mockReturnValue(lean(paymentDoc));
    vi.mocked(Order.findById).mockReturnValue(lean(orderDoc));
    vi.mocked(Fulfillment.findOneAndUpdate).mockReturnValue(
      fulfillExec() as never
    );
  });

  it("settles a matched paid transaction into a PAID order with a pending fulfillment", async () => {
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

    const result = await verifyCheckoutPayment("QL-PAY-ABC");

    expect(result).toMatchObject({
      status: "PAID",
      paymentStatus: "PAID",
      discrepancy: false,
    });
    expect(vi.mocked(Payment.updateOne)).toHaveBeenCalledWith(
      { _id: "PAY1" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "PAID" }),
      })
    );
    expect(vi.mocked(Order.updateOne)).toHaveBeenCalledWith(
      { _id: "ORD1" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "PAID", paymentId: "PAY1" }),
      })
    );
    expect(vi.mocked(Fulfillment.findOneAndUpdate)).toHaveBeenCalledWith(
      { orderId: "ORD1", orderItemId: "PROD1", type: "CLASSROOM_ENROLLMENT" },
      expect.anything(),
      expect.objectContaining({ upsert: true })
    );
  });

  it("marks amount mismatches as SUSPICIOUS and never fulfills", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          reference: "QL-PAY-ABC",
          status: "success",
          amount: 5_500_000,
          currency: "NGN",
        },
      },
    });

    const result = await verifyCheckoutPayment("QL-PAY-ABC");

    expect(result).toMatchObject({
      paymentStatus: "SUSPICIOUS",
      discrepancy: true,
    });
    expect(vi.mocked(Payment.updateOne)).toHaveBeenCalledWith(
      { _id: "PAY1" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "SUSPICIOUS" }),
      })
    );
    expect(vi.mocked(Order.updateOne)).not.toHaveBeenCalled();
    expect(vi.mocked(Fulfillment.findOneAndUpdate)).not.toHaveBeenCalled();
  });

  it("treats a currency mismatch as suspicious", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          reference: "QL-PAY-ABC",
          status: "success",
          amount: 5_000_000,
          currency: "USD",
        },
      },
    });
    const result = await verifyCheckoutPayment("QL-PAY-ABC");
    expect(result.discrepancy).toBe(true);
    expect(vi.mocked(Fulfillment.findOneAndUpdate)).not.toHaveBeenCalled();
  });

  it("does not settle when the provider reports the payment as not paid", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          reference: "QL-PAY-ABC",
          status: "abandoned",
          amount: 0,
          currency: "NGN",
        },
      },
    });

    const result = await verifyCheckoutPayment("QL-PAY-ABC");

    expect(result).toMatchObject({ paymentStatus: "ABANDONED" });
    expect(vi.mocked(Order.updateOne)).not.toHaveBeenCalled();
    expect(vi.mocked(Fulfillment.findOneAndUpdate)).not.toHaveBeenCalled();
  });

  it("is idempotent when the payment is already paid", async () => {
    vi.mocked(Payment.findOne).mockReturnValue(
      lean({ ...paymentDoc, status: "PAID", paidAt: new Date() })
    );
    vi.mocked(Order.findById).mockReturnValue(
      lean({ ...orderDoc, status: "PAID", paymentId: "PAY1", paidAt: new Date() })
    );

    const result = await verifyCheckoutPayment("QL-PAY-ABC");

    expect(result.paymentStatus).toBe("PAID");
    expect(mockGet).not.toHaveBeenCalled();
    expect(vi.mocked(Fulfillment.findOneAndUpdate)).not.toHaveBeenCalled();
  });
});

describe("processPaystackWebhook", () => {
  it("rejects a webhook with an invalid signature", async () => {
    const body = JSON.stringify({ event: "charge.success" });
    const result = await processPaystackWebhook(body, "deadbeef");
    expect(result).toMatchObject({ accepted: false, reason: "INVALID_SIGNATURE" });
    expect(vi.mocked(PaymentEvent.create)).not.toHaveBeenCalled();
  });

  it("acknowledges duplicate events without reprocessing", async () => {
    const payload = {
      event: "charge.success",
      data: {
        id: 42,
        reference: "QL-PAY-ABC",
        status: "success",
        amount: 5_000_000,
        currency: "NGN",
      },
    };
    const body = JSON.stringify(payload);
    const signature = sign(body);
    vi.mocked(PaymentEvent.findOne).mockReturnValue(
      lean({ _id: "EV1", providerEventKey: "charge.success:42" })
    );

    const result = await processPaystackWebhook(body, signature);

    expect(result).toMatchObject({ accepted: true, duplicate: true });
    expect(vi.mocked(PaymentEvent.create)).not.toHaveBeenCalled();
  });

  it("settles a valid charge.success webhook and records processing", async () => {
    const payload = {
      event: "charge.success",
      data: {
        id: 7,
        reference: "QL-PAY-ABC",
        status: "success",
        amount: 5_000_000,
        currency: "NGN",
      },
    };
    const body = JSON.stringify(payload);
    const signature = sign(body);

    vi.mocked(PaymentEvent.findOne).mockReturnValue(lean(null));
    vi.mocked(PaymentEvent.create).mockResolvedValue({ _id: "EV1" } as never);
    vi.mocked(Payment.findOne).mockReturnValue(lean(paymentDoc));
    vi.mocked(Order.findById).mockReturnValue(lean(orderDoc));
    vi.mocked(Fulfillment.findOneAndUpdate).mockReturnValue(
      fulfillExec() as never
    );

    const result = await processPaystackWebhook(body, signature);

    expect(result).toMatchObject({ accepted: true, duplicate: false });
    expect(vi.mocked(PaymentEvent.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "charge.success",
        providerEventKey: "charge.success:7",
        signatureValid: true,
        processingStatus: "PROCESSING",
      })
    );
    expect(vi.mocked(Order.updateOne)).toHaveBeenCalledWith(
      { _id: "ORD1" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "PAID" }),
      })
    );
    expect(vi.mocked(PaymentEvent.updateOne)).toHaveBeenCalledWith(
      { provider: "paystack", providerEventKey: "charge.success:7" },
      expect.objectContaining({
        $set: expect.objectContaining({ processingStatus: "PROCESSED" }),
      })
    );
  });

  it("marks a matched transaction as suspicious when a webhook amount mismatches", async () => {
    const payload = {
      event: "charge.success",
      data: {
        id: 8,
        reference: "QL-PAY-ABC",
        status: "success",
        amount: 9_000_000,
        currency: "NGN",
      },
    };
    const body = JSON.stringify(payload);
    const signature = sign(body);

    vi.mocked(PaymentEvent.findOne).mockReturnValue(lean(null));
    vi.mocked(PaymentEvent.create).mockResolvedValue({ _id: "EV1" } as never);
    vi.mocked(Payment.findOne).mockReturnValue(lean(paymentDoc));
    vi.mocked(Order.findById).mockReturnValue(lean(orderDoc));

    const result = await processPaystackWebhook(body, signature);

    expect(result.accepted).toBe(true);
    expect(vi.mocked(Payment.updateOne)).toHaveBeenCalledWith(
      { _id: "PAY1" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "SUSPICIOUS" }),
      })
    );
    expect(vi.mocked(Order.updateOne)).not.toHaveBeenCalled();
    expect(vi.mocked(Fulfillment.findOneAndUpdate)).not.toHaveBeenCalled();
  });

  it("ignores non-charge events after persisting them", async () => {
    const payload = { event: "transfer.success", data: { id: 99 } };
    const body = JSON.stringify(payload);
    const signature = sign(body);

    vi.mocked(PaymentEvent.findOne).mockReturnValue(lean(null));
    vi.mocked(PaymentEvent.create).mockResolvedValue({ _id: "EV2" } as never);

    const result = await processPaystackWebhook(body, signature);

    expect(result.accepted).toBe(true);
    expect(vi.mocked(PaymentEvent.updateOne)).toHaveBeenCalledWith(
      { provider: "paystack", providerEventKey: "transfer.success:99" },
      expect.objectContaining({
        $set: expect.objectContaining({ processingStatus: "IGNORED" }),
      })
    );
    expect(vi.mocked(Payment.findOne)).not.toHaveBeenCalled();
  });
});

describe("verifyCheckoutPayment retry behavior", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a raw processing response and settles once Paystack reports success", async () => {
    vi.useFakeTimers();
    vi.mocked(Payment.findOne).mockReturnValue(lean(paymentDoc));
    vi.mocked(Order.findById).mockReturnValue(lean(orderDoc));
    vi.mocked(Fulfillment.findOneAndUpdate).mockReturnValue(
      fulfillExec() as never
    );
    mockGet
      .mockResolvedValueOnce({
        data: {
          data: {
            reference: "QL-PAY-ABC",
            status: "processing",
            amount: 0,
            currency: "NGN",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            reference: "QL-PAY-ABC",
            status: "success",
            amount: 5_000_000,
            currency: "NGN",
          },
        },
      });

    const promise = verifyCheckoutPayment("QL-PAY-ABC");
    await vi.advanceTimersByTimeAsync(20_000);
    const result = await promise;

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ paymentStatus: "PAID" });
    expect(vi.mocked(Order.updateOne)).toHaveBeenCalled();
  });

  it("does not mark the payment failed while the provider is still processing", async () => {
    vi.useFakeTimers();
    vi.mocked(Payment.findOne).mockReturnValue(lean(paymentDoc));
    vi.mocked(Order.findById).mockReturnValue(lean(orderDoc));
    mockGet.mockResolvedValue({
      data: {
        data: {
          reference: "QL-PAY-ABC",
          status: "processing",
          amount: 0,
          currency: "NGN",
        },
      },
    });

    const promise = verifyCheckoutPayment("QL-PAY-ABC");
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await promise;

    expect(mockGet).toHaveBeenCalledTimes(4);
    expect(result.paymentStatus).toBe("PENDING");
    expect(vi.mocked(Payment.updateOne)).not.toHaveBeenCalled();
    expect(vi.mocked(Order.updateOne)).not.toHaveBeenCalled();
    expect(vi.mocked(Fulfillment.findOneAndUpdate)).not.toHaveBeenCalled();
  });

  it("recovers from a retryable provider error and settles", async () => {
    vi.useFakeTimers();
    vi.mocked(Payment.findOne).mockReturnValue(lean(paymentDoc));
    vi.mocked(Order.findById).mockReturnValue(lean(orderDoc));
    vi.mocked(Fulfillment.findOneAndUpdate).mockReturnValue(
      fulfillExec() as never
    );
    mockGet
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({
        data: {
          data: {
            reference: "QL-PAY-ABC",
            status: "success",
            amount: 5_000_000,
            currency: "NGN",
          },
        },
      });

    const promise = verifyCheckoutPayment("QL-PAY-ABC");
    await vi.advanceTimersByTimeAsync(20_000);
    const result = await promise;

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ paymentStatus: "PAID" });
  });

  it("throws when every retryable attempt fails", async () => {
    vi.useFakeTimers();
    vi.mocked(Payment.findOne).mockReturnValue(lean(paymentDoc));
    mockGet.mockRejectedValue(new Error("timeout"));

    const promise = verifyCheckoutPayment("QL-PAY-ABC");
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(promise).rejects.toMatchObject({ retryable: true });
    expect(vi.mocked(Payment.updateOne)).not.toHaveBeenCalled();
  });
});

it("exports an OrderServiceError with status", () => {
  const error = new OrderServiceError("X", "message", 422);
  expect(error.status).toBe(422);
  expect(error.code).toBe("X");
});