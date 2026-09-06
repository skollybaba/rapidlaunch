import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Order", () => ({
  Order: { findById: vi.fn(), updateOne: vi.fn(), find: vi.fn() },
}));

vi.mock("@/models/Booking", () => ({
  Booking: { findOne: vi.fn() },
}));

vi.mock("@/models/Fulfillment", () => ({
  Fulfillment: { findOne: vi.fn(), updateOne: vi.fn() },
}));

vi.mock("@/lib/services/order-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/order-service")>();
  return {
    ...actual,
    processCourseEnrollment: vi.fn().mockResolvedValue(undefined),
    bookConsultationIfPending: vi.fn().mockResolvedValue(undefined),
    sendPaymentConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  };
});

import { Booking } from "@/models/Booking";
import { Fulfillment } from "@/models/Fulfillment";
import { Order } from "@/models/Order";
import {
  bookConsultationIfPending,
  processCourseEnrollment,
  sendPaymentConfirmationEmail,
} from "@/lib/services/order-service";
import {
  dispatchFulfillmentRetries,
  retryOrderFulfillment,
} from "@/lib/services/fulfillment-service";

const paidOrder = {
  _id: "ORD1",
  orderReference: "QL-XYZ123",
  customerEmail: "buyer@example.com",
  status: "PAID",
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
  paidAt: new Date(),
  createdAt: new Date(),
};

function lean(value: unknown) {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    skip: () => chain,
    select: () => chain,
    lean: () => chain,
    exec: vi.fn().mockResolvedValue(value),
  } as never;
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Booking.findOne).mockReturnValue(
    lean({ _id: "BOOK1", orderId: "ORD1", status: "CONFIRMED" })
  );
  vi.mocked(Fulfillment.findOne).mockReturnValue(
    lean({ _id: "FUL1", orderId: "ORD1", status: "FULFILLED", metadata: {} })
  );
});

describe("retryOrderFulfillment", () => {
  it("rejects a non-existent order", async () => {
    vi.mocked(Order.findById).mockReturnValue(lean(null));
    await expect(retryOrderFulfillment("NOPE")).rejects.toThrow(
      "Order not found"
    );
  });

  it("rejects an order that is not paid", async () => {
    vi.mocked(Order.findById).mockReturnValue(
      lean({ ...paidOrder, status: "PENDING" })
    );
    await expect(retryOrderFulfillment("ORD1")).rejects.toThrow(
      "Only paid orders can be retried"
    );
  });

  it("runs enrollment, booking, and confirmation email for a paid order", async () => {
    vi.mocked(Order.findById).mockReturnValue(lean(paidOrder));
    vi.mocked(Fulfillment.findOne).mockReturnValue(
      lean({ _id: "FUL1", orderId: "ORD1", status: "FULFILLED", metadata: {} })
    );
    vi.mocked(Booking.findOne).mockReturnValue(
      lean({ _id: "BOOK1", orderId: "ORD1", status: "CONFIRMED" })
    );
    vi.mocked(Order.updateOne).mockResolvedValue({} as never);

    const outcome = await retryOrderFulfillment("ORD1");

    expect(processCourseEnrollment).toHaveBeenCalled();
    expect(bookConsultationIfPending).toHaveBeenCalled();
    expect(sendPaymentConfirmationEmail).toHaveBeenCalled();
    expect(outcome).toMatchObject({
      orderId: "ORD1",
      courseEnrolled: true,
      bookingConfirmed: true,
    });
  });

  it("marks the confirmation email as sent when the flag is persisted", async () => {
    vi.mocked(Order.findById)
      .mockReturnValueOnce(lean(paidOrder))
      .mockReturnValueOnce(
        lean({ _id: "ORD1", metadata: { confirmationEmailSentAt: new Date() } })
      );
    vi.mocked(Fulfillment.findOne).mockReturnValue(
      lean({ _id: "FUL1", orderId: "ORD1", status: "FULFILLED", metadata: {} })
    );
    vi.mocked(Booking.findOne).mockReturnValue(
      lean({ _id: "BOOK1", orderId: "ORD1", status: "CONFIRMED" })
    );
    vi.mocked(Order.updateOne).mockResolvedValue({} as never);

    const outcome = await retryOrderFulfillment("ORD1");

    expect(outcome.confirmationEmailSent).toBe(true);
  });

  it("reports courseEnrolled false when enrollment is still not fulfilled", async () => {
    vi.mocked(Order.findById).mockReturnValue(lean(paidOrder));
    vi.mocked(Fulfillment.findOne).mockReturnValue(
      lean({ _id: "FUL1", orderId: "ORD1", status: "PENDING", metadata: {} })
    );
    vi.mocked(Booking.findOne).mockReturnValue(
      lean({ _id: "BOOK1", orderId: "ORD1", status: "CONFIRMED" })
    );
    vi.mocked(Order.updateOne).mockResolvedValue({} as never);

    const outcome = await retryOrderFulfillment("ORD1");

    expect(outcome.courseEnrolled).toBe(false);
  });
});

describe("dispatchFulfillmentRetries", () => {
  it("processes paid orders that still need fulfillment and are not throttled", async () => {
    vi.mocked(Order.find).mockReturnValue(
      lean([
        { ...paidOrder, _id: "ORD1" },
        { ...paidOrder, _id: "ORD2", metadata: { productType: "CONSULTATION", productFulfillmentMode: "SCHEDULER" } },
      ])
    );
    vi.mocked(Order.findById).mockReturnValue(lean(paidOrder));
    vi.mocked(Order.updateOne).mockResolvedValue({} as never);
    vi.mocked(Fulfillment.findOne).mockReturnValue(
      lean({ _id: "FUL1", orderId: "ORD1", status: "FULFILLED", metadata: {} })
    );
    vi.mocked(Booking.findOne).mockReturnValue(
      lean({ _id: "BOOK1", orderId: "ORD1", status: "CONFIRMED" })
    );

    const result = await dispatchFulfillmentRetries();

    expect(result.processed).toBe(2);
    expect(processCourseEnrollment).toHaveBeenCalled();
    expect(sendPaymentConfirmationEmail).toHaveBeenCalled();
  });

  it("selects only paid orders needing fulfillment and not recently throttled", async () => {
    vi.mocked(Order.find).mockReturnValue(lean([]));

    await dispatchFulfillmentRetries();

    const filter = vi.mocked(Order.find).mock.calls[0][0] as unknown as {
      status: string;
      $or: Record<string, unknown>[];
    };
    expect(filter.status).toBe("PAID");
    expect(filter.$or).toContainEqual({
      "metadata.confirmationEmailSentAt": { $exists: false },
    });
    expect(filter.$or).toContainEqual({
      "metadata.lastFulfillmentRetryAt": { $exists: false },
    });
    expect(filter.$or[2]).toMatchObject({
      "metadata.lastFulfillmentRetryAt": { $lt: expect.any(Date) },
    });
  });
});
