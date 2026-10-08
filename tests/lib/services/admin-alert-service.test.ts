import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  SALES_ALERT_EMAILS: "agilemindshubcentral@gmail.com, ops@example.com",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  GOOGLE_CALENDAR_TIME_ZONE: "Africa/Lagos",
}));

vi.mock("@/lib/env", () => ({ env: envMock }));

vi.mock("@/lib/db", () => ({
  dbConnect: vi.fn().mockResolvedValue({}),
}));

const orderUpdateOne = vi.fn();

vi.mock("@/models/Order", () => ({
  Order: {
    updateOne: (...args: unknown[]) => orderUpdateOne(...args),
  },
}));

const sendTemplateEmail = vi.fn();

vi.mock("@/lib/providers/mail", () => ({
  createMailAdapter: vi.fn(() => ({ sendTemplateEmail })),
}));

import {
  buildSaleAlertVariables,
  getSalesAlertRecipients,
  isCourseOrSessionOrder,
  notifyAdminsOfSale,
} from "@/lib/services/admin-alert-service";
import type { OrderDoc } from "@/types/order";

type LeanOrder = OrderDoc & { __v?: number };

function orderDoc(
  overrides: Partial<Record<string, unknown>> = {}
): LeanOrder {
  return {
    _id: "ORD1",
    orderReference: "QL-1001",
    customerEmail: "student@example.com",
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
    metadata: {},
    paidAt: new Date("2026-10-08T16:14:00Z"),
    ...overrides,
  } as LeanOrder;
}

const paymentDoc = {
  _id: "PAY1",
  provider: "paystack",
  providerReference: "QL-PAY-ABC",
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  envMock.SALES_ALERT_EMAILS =
    "agilemindshubcentral@gmail.com, ops@example.com";
  orderUpdateOne.mockResolvedValue({ matchedCount: 1 });
  sendTemplateEmail.mockResolvedValue({
    providerMessageId: "msg-1",
    sentAt: new Date(),
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("isCourseOrSessionOrder", () => {
  it("matches course and session orders only", () => {
    expect(isCourseOrSessionOrder(orderDoc())).toBe(true);
    expect(
      isCourseOrSessionOrder(
        orderDoc({
          items: [
            {
              productId: "PROD2",
              titleSnapshot: "Strategy Session",
              typeSnapshot: "CONSULTATION",
              unitPriceMinor: 50_000,
              quantity: 1,
            },
          ],
        })
      )
    ).toBe(true);
    expect(
      isCourseOrSessionOrder(
        orderDoc({
          items: [
            {
              productId: "PROD3",
              titleSnapshot: "Launch Playbook",
              typeSnapshot: "BOOK",
              unitPriceMinor: 10_000,
              quantity: 1,
            },
          ],
        })
      )
    ).toBe(false);
    expect(isCourseOrSessionOrder(orderDoc({ items: [] }))).toBe(false);
  });
});

describe("getSalesAlertRecipients", () => {
  it("splits, deduplicates and drops invalid addresses", () => {
    envMock.SALES_ALERT_EMAILS =
      " Owner@Example.com , owner@example.com, not-an-email, , ops@example.com ";
    expect(getSalesAlertRecipients()).toEqual([
      "owner@example.com",
      "ops@example.com",
    ]);
  });

  it("returns an empty list when nothing is configured", () => {
    envMock.SALES_ALERT_EMAILS = "";
    expect(getSalesAlertRecipients()).toEqual([]);
  });
});

describe("notifyAdminsOfSale", () => {
  it("emails every configured recipient and claims the order once", async () => {
    const result = await notifyAdminsOfSale(orderDoc(), paymentDoc);

    expect(result).toEqual({ sent: 2, skipped: 0 });

    expect(orderUpdateOne).toHaveBeenCalledTimes(1);
    expect(orderUpdateOne).toHaveBeenCalledWith(
      { _id: "ORD1", "metadata.saleAlertNotifiedAt": { $exists: false } },
      expect.objectContaining({
        $set: expect.objectContaining({ "metadata.saleAlertNotifiedAt": expect.any(Date) }),
      })
    );

    expect(sendTemplateEmail).toHaveBeenCalledTimes(2);
    expect(sendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: "admin_order_alert",
        to: "agilemindshubcentral@gmail.com",
        variables: expect.objectContaining({
          itemTitle: "AI Course",
          itemKind: "Course",
          orderReference: "QL-1001",
          amount: "₦50,000.00",
          customerEmail: "student@example.com",
          paymentReference: "QL-PAY-ABC",
          adminOrdersUrl: "http://localhost:3000/admin/orders",
        }),
      })
    );
    expect(sendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ops@example.com" })
    );
  });

  it("does not send a second alert when the order was already announced", async () => {
    orderUpdateOne.mockResolvedValue({ matchedCount: 0 });

    const result = await notifyAdminsOfSale(
      orderDoc({ metadata: { saleAlertNotifiedAt: new Date() } }),
      paymentDoc
    );

    expect(result).toEqual({ sent: 0, skipped: 1 });
    expect(sendTemplateEmail).not.toHaveBeenCalled();
  });

  it("ignores book-only orders", async () => {
    const result = await notifyAdminsOfSale(
      orderDoc({
        items: [
          {
            productId: "PROD3",
            titleSnapshot: "Launch Playbook",
            typeSnapshot: "BOOK",
            unitPriceMinor: 10_000,
            quantity: 1,
          },
        ],
      }),
      paymentDoc
    );

    expect(result).toEqual({ sent: 0, skipped: 0 });
    expect(orderUpdateOne).not.toHaveBeenCalled();
    expect(sendTemplateEmail).not.toHaveBeenCalled();
  });

  it("does nothing when no recipients are configured", async () => {
    envMock.SALES_ALERT_EMAILS = "";

    const result = await notifyAdminsOfSale(orderDoc(), paymentDoc);

    expect(result).toEqual({ sent: 0, skipped: 0 });
    expect(orderUpdateOne).not.toHaveBeenCalled();
    expect(sendTemplateEmail).not.toHaveBeenCalled();
  });

  it("releases the claim when every send fails so a retry can succeed", async () => {
    sendTemplateEmail.mockRejectedValue(new Error("SMTP down"));

    const result = await notifyAdminsOfSale(orderDoc(), paymentDoc);

    expect(result).toEqual({ sent: 0, skipped: 2 });
    expect(orderUpdateOne).toHaveBeenCalledTimes(2);
    expect(orderUpdateOne).toHaveBeenLastCalledWith(
      { _id: "ORD1" },
      { $unset: { "metadata.saleAlertNotifiedAt": "" } }
    );
  });

  it("keeps the claim when at least one recipient received it", async () => {
    sendTemplateEmail
      .mockRejectedValueOnce(new Error("SMTP down"))
      .mockResolvedValueOnce({ providerMessageId: "msg-2", sentAt: new Date() });

    const result = await notifyAdminsOfSale(orderDoc(), paymentDoc);

    expect(result).toEqual({ sent: 1, skipped: 1 });
    expect(orderUpdateOne).toHaveBeenCalledTimes(1);
    expect(orderUpdateOne.mock.calls[0][1]).not.toHaveProperty("$unset");
  });
});

describe("buildSaleAlertVariables", () => {
  it("labels a session order and reports the second item", () => {
    const variables = buildSaleAlertVariables(
      orderDoc({
        items: [
          {
            productId: "PROD2",
            titleSnapshot: "Strategy Session",
            typeSnapshot: "CONSULTATION",
            unitPriceMinor: 75_000,
            quantity: 1,
          },
          {
            productId: "PROD3",
            titleSnapshot: "Launch Playbook",
            typeSnapshot: "BOOK",
            unitPriceMinor: 10_000,
            quantity: 1,
          },
        ],
        totalMinor: 85_000,
      }),
      paymentDoc
    );

    expect(variables).toMatchObject({
      itemTitle: "Strategy Session",
      itemKind: "Session",
      amount: "₦850.00",
      otherItems: "Launch Playbook",
      orderReference: "QL-1001",
      customerEmail: "student@example.com",
      paymentReference: "QL-PAY-ABC",
      adminOrdersUrl: "http://localhost:3000/admin/orders",
    });
    expect(variables.paidAt).toContain("2026");
  });

  it("falls back to an ISO timestamp for an invalid calendar time zone", () => {
    envMock.GOOGLE_CALENDAR_TIME_ZONE = "Not/AZone";

    const variables = buildSaleAlertVariables(orderDoc(), null);

    expect(variables.paidAt).toBe("2026-10-08T16:14:00.000Z");
    expect(variables.paymentReference).toBe("");
  });
});
