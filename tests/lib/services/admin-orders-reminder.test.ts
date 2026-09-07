import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, mailAdapter } = vi.hoisted(() => ({
  mockEnv: {
    NEXT_PUBLIC_APP_URL: "https://quicklaunch.example",
    PAYSTACK_SECRET_KEY: "sk_test_unit_dummy",
    PAYSTACK_WEBHOOK_SECRET: "whsec_unit_dummy",
    REMINDER_CRON_SECRET: "unit-test-reminder-secret",
    WHATSAPP_ADMIN_NUMBERS: "",
  },
  mailAdapter: {
    sendTemplateEmail: vi.fn().mockResolvedValue({}),
    sendEmail: vi.fn().mockResolvedValue({}),
    sendTestEmail: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

vi.mock("@/models/Booking", () => ({
  Booking: {
    findBy: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("@/models/Fulfillment", () => ({}));
vi.mock("@/models/User", () => ({}));

vi.mock("@/models/Order", () => ({
  Order: { find: vi.fn(), findById: vi.fn(), aggregate: vi.fn(), countDocuments: vi.fn() },
}));
vi.mock("@/models/Payment", () => ({
  Payment: { find: vi.fn() },
}));
vi.mock("@/models/Product", () => ({
  Product: { find: vi.fn(), findById: vi.fn() },
}));

vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: vi.fn(() => mailAdapter),
}));

import { Booking } from "@/models/Booking";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import {
  AdminServiceError,
  getAdminOrders,
  getOrderRangeStats,
  sendBookingPaymentReminder,
} from "@/lib/services/admin-service";

const mockBookingFindById = vi.mocked(Booking.findById);
const mockBookingUpdateOne = vi.mocked(Booking.updateOne);
const mockOrderFindById = vi.mocked(Order.findById);
const mockOrderFind = vi.mocked(Order.find);
const mockOrderAggregate = vi.mocked(Order.aggregate);
const mockSendTemplateEmail = vi.mocked(mailAdapter.sendTemplateEmail);

function chain(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  } as never;
}

const bookingDoc = {
  _id: "BK1",
  orderId: "ORD1",
  productId: "PROD1",
  customerEmail: "buyer@example.com",
  customerName: "Buyer Person",
  status: "PENDING",
  dismissedAt: null,
};

const orderDoc = {
  _id: "ORD1",
  orderReference: "QL-ORD1",
  status: "PENDING",
  customerEmail: "buyer@example.com",
  items: [{ productId: "PROD1", titleSnapshot: "AI Product Strategy", typeSnapshot: "COURSE" }],
};

const paidOrderDoc = {
  ...orderDoc,
  status: "PAID",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockBookingFindById.mockImplementation(() =>
    chain(bookingDoc)
  );
  mockOrderFindById.mockImplementation(() => chain(orderDoc));
  mockBookingUpdateOne.mockResolvedValue({} as never);
  vi.mocked(Order.countDocuments).mockResolvedValue(0 as never);
  vi.mocked(Booking.find).mockImplementation(() => chain([]));
  vi.mocked(Order.find).mockImplementation(() => chain([]));
  vi.mocked(Order.aggregate).mockImplementation(() => chain([]));
  vi.mocked(Payment.find).mockImplementation(() => chain([]));
  vi.mocked(Product.find).mockImplementation(() => chain([]));
  mockSendTemplateEmail.mockResolvedValue({
    providerMessageId: "M1",
    sentAt: new Date(),
  });
});

describe("sendBookingPaymentReminder", () => {
  it("sends a payment_reminder email and records when it was sent", async () => {
    const result = await sendBookingPaymentReminder("BK1");

    expect(mockSendTemplateEmail).toHaveBeenCalledTimes(1);
    const [input] = mockSendTemplateEmail.mock.calls[0];
    expect(input.templateKey).toBe("payment_reminder");
    expect(input.to).toBe("buyer@example.com");
    expect(input.variables).toMatchObject({
      itemTitle: "AI Product Strategy",
      customerName: "Buyer Person",
      checkoutUrl: "https://quicklaunch.example/checkout/PROD1",
    });

    expect(mockBookingUpdateOne).toHaveBeenCalledWith(
      { _id: "BK1" },
      { $set: { lastReminderSentAt: expect.any(Date) } }
    );
    expect(result.to).toBe("buyer@example.com");
  });

  it("refuses to send a reminder once the order is paid", async () => {
    mockOrderFindById.mockImplementation(() => chain(paidOrderDoc));

    await expect(sendBookingPaymentReminder("BK1")).rejects.toMatchObject({
      code: "ORDER_ALREADY_PAID",
    });
    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
    expect(mockBookingUpdateOne).not.toHaveBeenCalled();
  });

  it("throws when the booking does not exist", async () => {
    mockBookingFindById.mockImplementation(() => chain(null));

    await expect(sendBookingPaymentReminder("BK1")).rejects.toEqual(
      expect.objectContaining({
        code: "BOOKING_NOT_FOUND",
      })
    );
  });

  it("passes the escalated error code when mail sending fails", async () => {
    mockSendTemplateEmail.mockRejectedValueOnce(new Error("smtp down"));

    const err = await sendBookingPaymentReminder("BK1").then(
      () => null,
      (e: unknown) => e as AdminServiceError
    );

    expect(err?.code).toBe("MAIL_SEND_FAILED");
    expect(mockBookingUpdateOne).not.toHaveBeenCalled();
  });
});

describe("getOrderRangeStats", () => {
  it("maps the aggregation result into a stable stats object", async () => {
    const value = [
      {
        totalOrders: 12,
        revenueMinor: 9_500_00,
        paidOrders: 9,
        pendingPayments: 2,
        failedPayments: 1,
        currency: "NGN",
      },
    ];
    mockOrderAggregate.mockImplementation(
      () =>
        ({
          exec: vi.fn().mockResolvedValue(value),
          then: (resolve: (v: unknown) => void) => resolve(value),
        }) as never
    );

    const stats = await getOrderRangeStats("today");

    expect(stats).toEqual({
      range: "today",
      totalOrders: 12,
      revenueMinor: 9_500_00,
      paidOrders: 9,
      pendingPayments: 2,
      failedPayments: 1,
      currency: "NGN",
    });
    const pipeline = mockOrderAggregate.mock.calls[0][0] as unknown as Array<
      Record<string, unknown>
    >;
    const match = pipeline.find(
      (stage) =>
        typeof stage === "object" && stage !== null && "$match" in stage
    );
    const matchStage = match as { $match?: { createdAt?: { $gte?: Date } } };
    expect(matchStage.$match?.createdAt?.$gte).toBeInstanceOf(Date);
  });

  it("defaults zeroed stats when the aggregation returns nothing", async () => {
    mockOrderAggregate.mockImplementation(
      () =>
        ({
          exec: vi.fn().mockResolvedValue([]),
          then: (resolve: (v: unknown) => void) => resolve([]),
        }) as never
    );

    const stats = await getOrderRangeStats("week");

    expect(stats.totalOrders).toBe(0);
    expect(stats.revenueMinor).toBe(0);
    expect(stats.currency).toBe("NGN");
  });
});

describe("getAdminOrders range filtering", () => {
  it("adds a createdAt window when filtering by today", async () => {
    mockOrderFind.mockImplementation(() => chain([]));
    mockOrderAggregate.mockImplementation(() =>
    chain([]) as never
    );

    await getAdminOrders({ range: "today" });

    const filter = mockOrderFind.mock.calls[0][0];
    expect((filter as { createdAt?: { $gte?: Date } }).createdAt?.$gte).toBeInstanceOf(Date);
  });

  it("keeps the filter open (no createdAt) for all-time listings", async () => {
    mockOrderFind.mockImplementation(() => chain([]));
    mockOrderAggregate.mockImplementation(() => chain([]) as never);

    await getAdminOrders({});

    const filter = mockOrderFind.mock.calls[0][0];
    expect((filter as { createdAt?: unknown }).createdAt).toBeUndefined();
  });
});