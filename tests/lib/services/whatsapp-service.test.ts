import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    WHATSAPP_ADMIN_NUMBERS: "08160504976, 08123456789",
  },
}));

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/models/Order", () => ({
  Order: { updateOne: vi.fn().mockResolvedValue({}) },
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/providers/whatsapp", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/providers/whatsapp")>();
  return {
    ...actual,
    createWhatsAppAdapter: vi.fn(),
  };
});

import { Order } from "@/models/Order";
import {
  createWhatsAppAdapter,
  type WhatsAppAdapter,
} from "@/lib/providers/whatsapp";
import {
  buildPaidOrderMessage,
  getWhatsAppAdminNumbers,
  notifyAdminsOrderPaid,
} from "@/lib/services/whatsapp-service";

const mockSendText = vi.fn();
const mockAdapter = {
  sendText: mockSendText,
} as unknown as WhatsAppAdapter;

vi.mocked(createWhatsAppAdapter).mockReturnValue(mockAdapter);

const order = {
  _id: "ord_1",
  orderReference: "QL-ABC-123",
  status: "PAID",
  customerEmail: "buyer@example.com",
  items: [{ titleSnapshot: "AI Product Strategy Course" }],
  totalMinor: 80_000_00,
  currency: "NGN",
  metadata: {},
  paidAt: new Date(),
} as never;

const payment = {
  _id: "pay_1",
  providerReference: "payst_ref_1",
  status: "PAID",
  amountMinor: 80_000_00,
  currency: "NGN",
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.WHATSAPP_ADMIN_NUMBERS = "08160504976, 08123456789";
});

describe("getWhatsAppAdminNumbers", () => {
  it("parses, normalizes and dedupes the configured numbers", () => {
    expect(getWhatsAppAdminNumbers()).toEqual([
      "+2348160504976",
      "+2348123456789",
    ]);
  });

  it("returns an empty list when nothing is configured", () => {
    mockEnv.WHATSAPP_ADMIN_NUMBERS = "";
    expect(getWhatsAppAdminNumbers()).toEqual([]);
  });
});

describe("buildPaidOrderMessage", () => {
  it("includes order, item, amount and payment details", () => {
    const message = buildPaidOrderMessage(order as never, payment as never);

    expect(message).toContain("New paid order on Rapid Launch");
    expect(message).toContain("AI Product Strategy Course");
    expect(message).toContain("Order reference: QL-ABC-123");
    expect(message).toContain("₦80,000");
    expect(message).toContain("Customer email: buyer@example.com");
    expect(message).toContain("Payment reference: payst_ref_1");
  });

  it("omits the payment reference when none is available", () => {
    const message = buildPaidOrderMessage(order as never, null);
    expect(message).not.toContain("Payment reference:");
  });
});

describe("notifyAdminsOrderPaid", () => {
  it("sends to every configured number and marks the order notified", async () => {
    mockSendText.mockResolvedValue({
      providerMessageId: "wamid-1",
      sentAt: new Date(),
    });

    const result = await notifyAdminsOrderPaid(order as never, payment as never);

    expect(result).toEqual({ sent: 2, skipped: 0 });
    expect(mockSendText).toHaveBeenCalledTimes(2);
    expect(mockSendText).toHaveBeenNthCalledWith(1, {
      to: "+2348160504976",
      text: expect.stringContaining("QL-ABC-123"),
    });
    expect(mockSendText).toHaveBeenNthCalledWith(2, {
      to: "+2348123456789",
      text: expect.stringContaining("QL-ABC-123"),
    });
    expect(Order.updateOne).toHaveBeenCalledWith(
      { _id: "ord_1" },
      { $set: { "metadata.whatsappNotifiedAt": expect.any(Date) } }
    );
  });

  it("skips sending when the order was already notified", async () => {
    const alreadyNotified = {
      ...(order as object),
      metadata: { whatsappNotifiedAt: new Date() },
    } as never;

    const result = await notifyAdminsOrderPaid(
      alreadyNotified,
      payment as never
    );

    expect(result).toEqual({ sent: 0, skipped: 0 });
    expect(mockSendText).not.toHaveBeenCalled();
    expect(Order.updateOne).not.toHaveBeenCalled();
  });

  it("still records success when only some recipients fail", async () => {
    mockSendText
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ providerMessageId: "wamid-2", sentAt: new Date() });

    const result = await notifyAdminsOrderPaid(order as never, payment as never);

    expect(result).toEqual({ sent: 1, skipped: 1 });
    expect(mockSendText).toHaveBeenCalledTimes(2);
    expect(Order.updateOne).toHaveBeenCalledTimes(1);
  });

  it("does not mark the order notified when every recipient fails", async () => {
    mockSendText.mockRejectedValue(new Error("provider timeout"));

    const result = await notifyAdminsOrderPaid(order as never, payment as never);

    expect(result).toEqual({ sent: 0, skipped: 2 });
    expect(Order.updateOne).not.toHaveBeenCalled();
  });

  it("does nothing when no admin numbers are configured", async () => {
    mockEnv.WHATSAPP_ADMIN_NUMBERS = "";

    const result = await notifyAdminsOrderPaid(order as never, payment as never);

    expect(result).toEqual({ sent: 0, skipped: 0 });
    expect(mockSendText).not.toHaveBeenCalled();
    expect(Order.updateOne).not.toHaveBeenCalled();
  });
});